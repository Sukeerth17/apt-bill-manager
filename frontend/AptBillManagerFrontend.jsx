import React, { useState, useEffect, useCallback } from 'react';
import { 
  LogIn, Settings, Upload, CheckCircle, X, User, Trash2, Edit, Send, 
  RefreshCw, Users, Key, Mail, AlertTriangle, BookOpen, Link2
} from 'lucide-react';

// --- API Configuration ---
// Assuming FastAPI is running on http://localhost:8000
const API_BASE_URL = 'http://localhost:8000/api/v1';

// --- Utility Functions ---

/**
 * Helper to fetch data, including the JWT for authentication.
 * @param {string} endpoint - The API endpoint to call (e.g., /auth/me)
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object | FormData} body - Data to send
 * @param {string} token - The JWT token
 * @returns {Promise<object>}
 */
const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = {};
  
  // Set headers only if the body is NOT FormData (file upload)
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // Handle 204 No Content response
  if (response.status === 204) {
      return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `API Error: ${response.statusText}`);
  }

  return data;
};

// --- Component: Notification System ---

const Notification = ({ message, setMessage }) => {
  if (!message.text) return null;

  const baseClasses = "fixed top-4 right-4 p-4 rounded-xl shadow-lg flex items-center z-50 transition-transform duration-300";
  const typeClasses = message.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white';

  useEffect(() => {
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return () => clearTimeout(timer);
  }, [message, setMessage]);

  return (
    <div className={`${baseClasses} ${typeClasses} animate-slide-in`}>
      {message.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
      <span>{message.text}</span>
      <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};


// --- Component: Login Screen ---

const LoginComponent = ({ setToken, setMessage, setMemberEmail }) => {
  const [email, setEmail] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your committee email address.' });
      return;
    }
    setIsLoading(true);
    try {
      // API call to /auth/otp/request
      await apiCall('/auth/otp/request', 'POST', { email });
      setOtpMode(true);
      setMessage({ type: 'success', text: `OTP request sent! Check your email: ${email}` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit OTP.' });
      return;
    }
    setIsLoading(true);
    try {
      // API call to /auth/otp/verify
      const data = await apiCall('/auth/otp/verify', 'POST', { email, otp });
      localStorage.setItem('jwt_token', data.access_token);
      setToken(data.access_token);
      setMemberEmail(email);
      setMessage({ type: 'success', text: 'Access granted. Redirecting to Dashboard...' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-indigo-100">
      <h2 className="text-3xl font-extrabold text-indigo-700 mb-6 flex items-center">
        <LogIn className="w-7 h-7 mr-3" /> Committee Login
      </h2>
      {!otpMode ? (
        <div className="space-y-5">
          <p className="text-gray-600">Enter your authorized committee email for OTP access.</p>
          <input
            type="email"
            placeholder="Authorized Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            onClick={handleRequestOtp}
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
            <span>{isLoading ? 'Sending...' : 'Request OTP via Email'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-gray-600">Enter the 6-digit OTP sent to <span className="font-semibold text-indigo-600">{email}</span>.</p>
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            maxLength={6}
            onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <div className="flex space-x-3">
            <button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="flex-grow bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
              <span>Verify & Login</span>
            </button>
            <button
              onClick={() => setOtpMode(false)}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 transition duration-200"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Component: Settings (Committee Management) ---

const SettingsComponent = ({ token, setMessage, memberEmail }) => {
  const [members, setMembers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiCall('/auth/members', 'GET', null, token);
      setMembers(data);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to load committee members: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [token, setMessage]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async () => {
    if (!newEmail) {
      setMessage({ type: 'error', text: 'Email is required.' });
      return;
    }
    setIsLoading(true);
    try {
      await apiCall('/auth/members', 'POST', { email: newEmail, phone_number: newPhone || null }, token);
      setMessage({ type: 'success', text: `Member ${newEmail} added successfully.` });
      setNewEmail('');
      setNewPhone('');
      fetchMembers();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to add member: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberEmail) => {
    if (members.length <= 1) {
        setMessage({ type: 'error', text: 'Cannot remove: A minimum of 1 member is required.' });
        return;
    }
    if (memberEmail === memberEmail) {
        setMessage({ type: 'error', text: 'Cannot remove your own account.' });
        return;
    }
    if (!window.confirm(`Are you sure you want to remove ${memberEmail}?`)) return;

    setIsLoading(true);
    try {
      await apiCall(`/auth/members/${memberId}`, 'DELETE', null, token);
      setMessage({ type: 'success', text: `${memberEmail} removed successfully.` });
      fetchMembers();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to remove member: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-indigo-100">
      <h2 className="text-3xl font-extrabold text-indigo-700 mb-6 flex items-center">
        <Settings className="w-7 h-7 mr-3" /> Committee Access Management
      </h2>
      <p className="mb-4 text-gray-600">
        You are logged in as: <span className="font-semibold text-indigo-600">{memberEmail}</span>
      </p>

      <div className="bg-indigo-50 p-4 rounded-xl mb-6">
        <h3 className="text-xl font-bold text-indigo-800 flex items-center mb-3">
            <Users className="w-5 h-5 mr-2"/> Authorized Members ({members.length}/5)
        </h3>
        {isLoading ? (
            <div className="text-center py-4 text-indigo-500 flex items-center justify-center">
                 <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Loading members...
            </div>
        ) : (
            <ul className="space-y-3">
                {members.map(member => (
                    <li key={member.id} className={`flex justify-between items-center p-3 rounded-lg border ${member.email === memberEmail ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-gray-200'}`}>
                        <div className="flex-1 min-w-0">
                            <p className={`font-mono text-sm truncate ${member.email === memberEmail ? 'text-indigo-800 font-bold' : 'text-gray-800'}`}>{member.email}</p>
                            <p className="text-xs text-gray-500">{member.phone_number || 'No Phone'}</p>
                        </div>
                        {members.length > 1 && member.email !== memberEmail && (
                             <button 
                                onClick={() => handleRemoveMember(member.id, member.email)}
                                className="text-red-500 hover:text-red-700 p-2 rounded-full transition-colors"
                                disabled={isLoading}
                             >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        {member.email === memberEmail && (
                            <span className="text-xs font-semibold text-indigo-600 bg-white px-2 py-1 rounded-full border border-indigo-400">YOU</span>
                        )}
                    </li>
                ))}
            </ul>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold text-gray-700 mb-3">Add New Committee Member</h3>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="New Member Email (Required for OTP login)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading || members.length >= 5}
          />
          <input
            type="tel"
            placeholder="New Member Phone (Optional reference)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading || members.length >= 5}
          />
          <button
            onClick={handleAddMember}
            disabled={isLoading || members.length >= 5 || !newEmail}
            className={`w-full py-3 rounded-xl font-semibold transition duration-200 flex items-center justify-center space-x-2 ${members.length >= 5 ? 'bg-red-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {members.length >= 5 ? 'Max Members Reached (5)' : 'Add Authorized Member'}
            <Plus className="w-5 h-5"/>
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Component: Dashboard (Upload and Bill) ---

const DashboardComponent = ({ token, setMessage, setPage, memberEmail }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [billPreview, setBillPreview] = useState(null);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        setBillPreview(null);
    };

    const handleGenerateBills = async () => {
        if (!file) {
            setMessage({ type: 'error', text: 'Please select an Excel file first.' });
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // API call to /bill/generate
            const data = await apiCall('/bill/generate', 'POST', formData, token);
            setBillPreview(data);
            setMessage({ 
                type: 'success', 
                text: `Processing complete. ${data.notifications_ready} notifications sent via Telegram in background.` 
            });
            setFile(null); // Clear file input
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Calculate totals for the preview
    const totalAmountDue = billPreview?.preview.reduce((sum, record) => sum + record.amount_due, 0) || 0;
    const totalUnits = billPreview?.preview.reduce((sum, record) => sum + record.units_consumed, 0) || 0;


    return (
        <div className="max-w-5xl mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-indigo-100">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-3xl font-extrabold text-indigo-700 flex items-center">
                    <Upload className="w-7 h-7 mr-3" /> Bill Processing Dashboard
                </h2>
                <button 
                    onClick={() => setPage('settings')}
                    className="mt-4 md:mt-0 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors flex items-center space-x-1"
                >
                    <Settings className="w-5 h-5"/>
                    <span>Manage Committee ({memberEmail})</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Upload Section */}
                <div className="lg:col-span-2 bg-indigo-50 p-6 rounded-2xl border border-indigo-200 space-y-4">
                    <h3 className="text-xl font-bold text-indigo-800">1. Upload Consumption Excel</h3>
                    <p className="text-sm text-indigo-600 flex items-start">
                        <BookOpen className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0"/> 
                        Upload the latest **Water meter.xlsx** file. The system will skip the first 6 header rows.
                    </p>
                    <label className="block w-full cursor-pointer bg-white border-2 border-dashed border-indigo-400 p-6 rounded-xl hover:bg-indigo-50 transition-colors">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={isLoading}
                        />
                        <div className="flex items-center justify-center space-x-2 text-indigo-600">
                            <Upload className="w-6 h-6" />
                            <span className="font-semibold text-lg">
                                {file ? file.name : 'Click to select Excel file (.xlsx)'}
                            </span>
                        </div>
                    </label>
                </div>

                {/* 2. Notification Trigger Section */}
                <div className="lg:col-span-1 flex flex-col justify-between bg-green-50 p-6 rounded-2xl border border-green-200 space-y-4">
                    <h3 className="text-xl font-bold text-green-800">2. Send Notifications</h3>
                    <p className="text-sm text-green-600 flex items-start">
                        <Send className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0"/> 
                        Triggers **zero-cost** bill notifications via the Telegram Bot API in the background.
                    </p>
                    <button
                        onClick={handleGenerateBills}
                        disabled={isLoading || !file}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition duration-200 flex items-center justify-center space-x-2"
                    >
                        {isLoading ? (
                            <><RefreshCw className="w-5 h-5 animate-spin" /> <span>Processing & Sending...</span></>
                        ) : (
                            <><Send className="w-5 h-5" /> <span>Generate Bills & Notify</span></>
                        )}
                    </button>
                </div>
            </div>

            {/* 3. Bill Preview Section */}
            {billPreview && (
                <div className="mt-8 pt-8 border-t border-gray-300">
                    <h3 className="text-2xl font-bold text-indigo-700 mb-4">Processing Summary</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-indigo-50 p-4 rounded-xl shadow-md text-center">
                            <p className="text-sm text-gray-600">Total Records</p>
                            <p className="text-2xl font-bold text-indigo-800">{billPreview.total_records_processed}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl shadow-md text-center">
                            <p className="text-sm text-gray-600">Ready for Telegram</p>
                            <p className="text-2xl font-bold text-green-800">{billPreview.notifications_ready}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl shadow-md text-center">
                            <p className="text-sm text-gray-600">Skipped (No Chat ID)</p>
                            <p className="text-2xl font-bold text-red-800">{billPreview.skipped_records}</p>
                        </div>
                    </div>

                    <h4 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2"/> Top 10 Records Preview
                    </h4>
                    
                    <div className="overflow-x-auto rounded-xl shadow-inner border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Flat', 'Name', 'Units (Ltrs)', 'Amount (₹)', 'Telegram ID'].map(header => (
                                        <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {billPreview.preview.map((record, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{record.flat_no}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.units_consumed.toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-indigo-600">₹{record.amount_due.toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                                            {record.telegram_chat_id ? <span className="text-green-600">Attached</span> : <span className="text-red-500">Missing</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                        * Only records with a Telegram Chat ID attached were included in the background notification task.
                    </p>
                </div>
            )}
        </div>
    );
};

// --- Component: Flat Owner Registration (Mock) ---

const RegistrationComponent = ({ setMessage }) => {
    const [flatNo, setFlatNo] = useState('');
    const [chatId, setChatId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        if (!flatNo || !chatId) {
            setMessage({ type: 'error', text: 'Flat No and Telegram Chat ID are required.' });
            return;
        }

        setIsLoading(true);
        try {
            // API call to /bill/telegram/register
            await apiCall('/bill/telegram/register', 'POST', { flat_no: flatNo, telegram_chat_id: chatId });
            setMessage({ type: 'success', text: `Success! Flat ${flatNo} is now linked to receive bills via Telegram.` });
            setFlatNo('');
            setChatId('');
        } catch (error) {
            setMessage({ type: 'error', text: `Registration failed: ${error.message}. Ensure your Flat No is correct.` });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-green-100">
            <h2 className="text-3xl font-extrabold text-green-700 mb-4 flex items-center">
                <Link2 className="w-7 h-7 mr-3" /> Telegram Link Setup
            </h2>
            <p className="text-gray-600 mb-6 border-b pb-4">
                This is the zero-cost method to receive your monthly water bill. You must link your Telegram Chat ID here.
            </p>
            
            <div className="space-y-4">
                <p className="text-sm text-red-500 font-semibold">
                    1. Find your Chat ID: You must first start a chat with your apartment's Telegram Bot to get your unique ID.
                </p>
                <input
                    type="text"
                    placeholder="Your Flat No (e.g., A-101 or G1)"
                    value={flatNo}
                    onChange={(e) => setFlatNo(e.target.value.toUpperCase())}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                    disabled={isLoading}
                />
                <input
                    type="text"
                    placeholder="Your Telegram Chat ID (e.g., 123456789)"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value.replace(/[^\d]/g, ''))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                    disabled={isLoading}
                />
                <button
                    onClick={handleRegister}
                    disabled={isLoading || !flatNo || !chatId}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition duration-200 flex items-center justify-center space-x-2"
                >
                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Link2 className="w-5 h-5" />}
                    <span>Link My Telegram ID</span>
                </button>
            </div>
        </div>
    );
}

// --- Main App Component ---

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('jwt_token'));
  const [currentPage, setPage] = useState('login'); // 'login', 'dashboard', 'settings', 'register'
  const [memberEmail, setMemberEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check token validity on load
  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    if (storedToken) {
      apiCall('/auth/me', 'GET', null, storedToken)
        .then(member => {
          setToken(storedToken);
          setMemberEmail(member.email);
          setPage('dashboard');
        })
        .catch(() => {
          localStorage.removeItem('jwt_token');
          setToken(null);
        })
        .finally(() => setIsAuthLoading(false));
    } else {
        setIsAuthLoading(false);
    }
  }, []);
  
  // Set default page based on token
  useEffect(() => {
      if (!isAuthLoading) {
          if (token && memberEmail) {
              setPage('dashboard');
          } else {
              setPage('login');
          }
      }
  }, [token, memberEmail, isAuthLoading]);

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    setMemberEmail('');
    setPage('login');
    setMessage({ type: 'success', text: 'You have been securely logged out.' });
  };
  
  const renderContent = () => {
      if (isAuthLoading) {
          return <LoadingScreen message="Checking authentication..." />;
      }
      
      if (!token || !memberEmail) {
          return <LoginComponent setToken={setToken} setMessage={setMessage} setMemberEmail={setMemberEmail} />;
      }

      switch (currentPage) {
          case 'dashboard':
              return <DashboardComponent token={token} setMessage={setMessage} setPage={setPage} memberEmail={memberEmail} />;
          case 'settings':
              return <SettingsComponent token={token} setMessage={setMessage} memberEmail={memberEmail} />;
          case 'register':
              return <RegistrationComponent setMessage={setMessage} />;
          default:
              return <DashboardComponent token={token} setMessage={setMessage} setPage={setPage} memberEmail={memberEmail} />;
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
      <header className="flex justify-between items-center mb-10 max-w-5xl mx-auto">
        <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-black text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mr-2"><path d="M22 10.5V12a10 10 0 0 1-5.94 9.14 1 1 0 0 1-.84-.11L13 20a1 1 0 0 0-1 0l-1.22.89a1 1 0 0 1-.84.11A10 10 0 0 1 2 12V10.5M22 6.5L12 1 2 6.5M12 22v-6"/><path d="M6 10.5V12a6 6 0 0 0 6 6 6 6 0 0 0 6-6V10.5"/></svg>
                Apt Bill Manager
            </h1>
            {(token && currentPage !== 'login') && (
                <>
                    <button 
                        onClick={() => setPage('dashboard')}
                        className={`text-sm font-medium p-2 rounded-lg transition-colors ${currentPage === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setPage('register')}
                        className={`text-sm font-medium p-2 rounded-lg transition-colors ${currentPage === 'register' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        Flat Owner Registration Mock
                    </button>
                </>
            )}
        </div>
        
        {token && (
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transition duration-200 flex items-center space-x-1">
            <LogOut className="w-5 h-5"/>
            <span>Logout</span>
          </button>
        )}
      </header>
      {renderContent()}
      <Notification message={message} setMessage={setMessage} />
    </div>
  );
};

const LoadingScreen = ({ message }) => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
        <p className="text-lg font-medium text-gray-700">{message}</p>
    </div>
);

// Add necessary styles for utility classes (like animate-slide-in)
const style = `
@keyframes slide-in {
    0% { transform: translateX(100%); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
}
.animate-slide-in {
    animation: slide-in 0.3s ease-out forwards;
}
`;

export default App;