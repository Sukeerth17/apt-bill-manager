import os
import uuid
import tempfile
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from .. import schemas, crud, models
from ..database import get_db
from ..services.notification import send_all_notifications_task
from .auth import get_current_member # Reusing the security dependency

router = APIRouter()

# --- HELPER ENDPOINT FOR TELEGRAM REGISTRATION ---

@router.post("/telegram/register", response_model=schemas.FlatOwner, summary="Flat Owner Telegram Registration")
def register_telegram_id(registration: schemas.FlatOwnerRegister, db: Session = Depends(get_db)):
    """
    This endpoint is used by a flat owner (via the Telegram bot) to link their Chat ID to their flat number.
    This step is required for zero-cost notification delivery.
    """
    # 1. Check if the flat exists (it should have been created during a prior Excel upload)
    db_flat = crud.get_flat_owner_by_flat_no(db, flat_no=registration.flat_no.upper())
    if not db_flat:
        raise HTTPException(
            status_code=404, 
            detail="Flat number not found. Please ensure the committee has added you to the master list."
        )

    # 2. Update with the Telegram Chat ID
    updated_flat = crud.update_flat_owner_telegram_id(
        db, 
        flat_no=registration.flat_no.upper(), 
        chat_id=registration.telegram_chat_id
    )
    
    return updated_flat

# --- BILL GENERATION ENDPOINT ---

@router.post("/generate", response_model=schemas.BillProcessResponse, summary="Upload Excel and Prepare Bills for Notification")
async def generate_bills(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="The water consumption Excel file (.xlsx)"),
    db: Session = Depends(get_db),
    current_member: models.CommitteeMember = Depends(get_current_member) # Secured
):
    """
    Secured endpoint for committee members to upload the Excel file, 
    process the data, and trigger Telegram notifications in the background.
    """
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)."
        )

    # 1. Save the uploaded file temporarily to disk
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")
    
    try:
        with open(file_path, "wb") as buffer:
            # Read the file content in chunks
            while chunk := await file.read(8192):
                buffer.write(chunk)

        # 2. Process the file and generate bill records
        records = crud.process_and_generate_bills(db, file_path)
        
        if not records:
             raise HTTPException(
                status_code=422,
                detail="No valid bill records found in the file after processing."
            )

        # 3. Separate records that have a valid Telegram ID
        notifications_to_send = [r for r in records if r.telegram_chat_id]
        skipped_for_no_chat_id = len(records) - len(notifications_to_send)

        # 4. Trigger the zero-cost Telegram notifications in the background
        if notifications_to_send:
            background_tasks.add_task(send_all_notifications_task, notifications_to_send)

        # 5. Return the processing summary and a preview
        return schemas.BillProcessResponse(
            total_records_processed=len(records),
            notifications_ready=len(notifications_to_send),
            skipped_records=skipped_for_no_chat_id,
            preview=records[:10] # Return a preview of the first 10 records
        )

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        print(f"Fatal processing error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during bill generation.")
    finally:
        # 6. Clean up the temporary file
        if os.path.exists(file_path):
            os.remove(file_path)