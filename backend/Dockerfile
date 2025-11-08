# Use the official Python image as a base
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code
COPY ./app /app/app

# The command is defined in docker-compose.yml to ensure DB is ready first
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]