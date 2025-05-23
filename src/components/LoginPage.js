import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import 'react-toastify/dist/ReactToastify.css';
import '../css/components/Login.css';

function LoginPage() {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const { translateText } = useLanguage();

    const { login, updateStreak } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get API URL from environment variable
    const API_URL = process.env.REACT_APP_API_URL || 'https://da20-115-76-51-131.ngrok-free.app/api';
    
    // Log the API URL being used
    useEffect(() => {
        console.log('Using API URL:', API_URL);
    }, [API_URL]);

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    // Handle login completion
    const handleLoginComplete = () => {
        setRedirecting(true);
        
        // Check if there's a redirect path stored in localStorage
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        
        // Change the page transition handling to avoid blocking interactions
        setTimeout(() => {
            if (redirectPath) {
                // Clear the stored redirect path
                localStorage.removeItem('redirectAfterLogin');
                
                // Navigate to the stored path
                navigate(redirectPath);
            } else {
                // Default navigation to progress page
                navigate('/progress');
            }
            
            // Ensure there's no page-transition effect on the body
            document.body.classList.remove('page-transition');
        }, 300); // Reduce page transition time to 300ms
    };

    // Remove the page transition effect
    useEffect(() => {
        if (redirecting) {
            // Get redirect path if any
            const redirectPath = localStorage.getItem('redirectAfterLogin');
            
            // Ensure there's no page-transition effect
            document.body.classList.remove('page-transition');
            
            // Use setTimeout to avoid blocking effects
            setTimeout(() => {
                // Navigate to the stored path or default to progress
                navigate(redirectPath || '/progress');
                
                // Clear the stored redirect path
                if (redirectPath) {
                    localStorage.removeItem('redirectAfterLogin');
                }
            }, 300);
        }
    }, [redirecting, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            // Add more detailed logging
            console.log('Starting login process...');
            console.log('Login endpoint:', `${API_URL}/Auth/login`);
            console.log('Request payload:', JSON.stringify({ email, password: '******' }));
            
            const response = await fetch(`${API_URL}/Auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ email, password }),
            });
            
            console.log('Login response status:', response.status);
            console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Login failed response:', errorText);
                throw new Error('Login failed. Please check your information.');
            }
            
            const data = await response.json();
            console.log('Login successful, received data structure:', Object.keys(data));
            console.log('Token present:', !!data.token);
            console.log('RefreshToken present:', !!data.refreshToken);
            
            // Create user object from response information
            const userData = {
                email: data.email,
                roles: data.roles || [],
                // Other information can be added if available
            };
            
            console.log('Calling login function with userData:', userData);
            
            try {
                // Call login function from AuthContext with appropriate structure
                const loginSuccess = await login(
                    userData,           // user object
                    data.token,         // accessToken (changed from "token")
                    data.refreshToken   // refreshToken
                );

                console.log('Login function returned:', loginSuccess);
                
                console.log('Calling updateStreak function...');
                try {
                    await updateStreak();
                    console.log('UpdateStreak called successfully');
                } catch (streakError) {
                    console.error('UpdateStreak error (non-critical):', streakError);
                    // Continue anyway - this shouldn't block login
                }
            
                // Display success message
                if (loginSuccess) {
                    setLoginSuccess(true);
                    toast.success('Login successful!', {
                        position: "top-right",
                        autoClose: 1500,
                    });
                    
                    // Call API to get learning progress information (if needed)
                    try {
                        const progressResponse = await fetch(`${API_URL}/Learning/progress`, {
                            headers: {
                                'Authorization': `Bearer ${data.token}`
                            }
                        });
                        
                        if (progressResponse.ok) {
                            const progressData = await progressResponse.json();
                            console.log('Retrieved progress data:', progressData);
                        }
                    } catch (progressError) {
                        console.error('Failed to fetch progress data:', progressError);
                    }
                    
                    // Navigate to the appropriate page
                    handleLoginComplete();
                }
            } catch (loginError) {
                console.error('Error during auth context login:', loginError);
                setError('Authentication error: ' + (loginError.message || 'An unknown error occurred'));
                toast.error('Authentication error: ' + (loginError.message || 'An unknown error occurred'));
                setLoading(false);
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
            console.error('Login error:', err);
            
            // Display error message
            toast.error(err.message || 'An error occurred during login', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`login-container ${redirecting ? 'fade-out' : ''}`}>
            {/* Add ToastContainer to display notifications */}
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            
            <div className="login-background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
                <div className="shape shape-4"></div>
            </div>
            
            <div className="login-welcome">
                <Link to="/" className="login-logo">
                    <img src="/images/wordwise-logo.svg" alt="WordWise" className="login-logo-image" />
                    <span className="login-logo-text">WordWise</span>
                </Link>
                
                <div className="login-welcome-content">
                    <h1 className="login-welcome-title">{translateText('Welcome back to your language journey!')}</h1>
                    <p className="login-welcome-text">
                        {translateText('Log in to continue your progress, practice vocabulary, and achieve your language goals.')}
                    </p>
                    
                    <div className="login-features">
                        <div className="login-feature">
                            <div className="login-feature-icon">
                                <i className="fas fa-bolt"></i>
                            </div>
                            <div className="login-feature-text">
                                <h3>Daily Streak</h3>
                                <p>{translateText('Keep your learning momentum going')}</p>
                            </div>
                        </div>
                        
                        <div className="login-feature">
                            <div className="login-feature-icon">
                                <i className="fas fa-trophy"></i>
                            </div>
                            <div className="login-feature-text">
                                <h3>Achievements</h3>
                                <p>{translateText('Track your progress and earn rewards')}</p>
                            </div>
                        </div>
                        
                        <div className="login-feature">
                            <div className="login-feature-icon">
                                <i className="fas fa-sync-alt"></i>
                            </div>
                            <div className="login-feature-text">
                                <h3>Resume Learning</h3>
                                <p>{translateText('Continue right where you left off')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="login-character">
                    <img src="/images/owl-character.svg" alt="WordWise Mascot" />
                </div>
            </div>
            
            <div className="login-form-wrapper">
                <div className={`login-form-card ${redirecting ? 'scale-up' : ''}`}>
                    <div className="login-form-header">
                        <h2 className="login-form-title">Log In</h2>
                        <p className="login-form-subtitle">Welcome back! Please enter your details</p>
                    </div>
                    
                    {error && (
                        <div className="login-error-alert">
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}
                    
                    <div className="login-form-body">
                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">
                                    <i className="fas fa-envelope"></i>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label" htmlFor="password">
                                    <i className="fas fa-lock"></i>
                                    Password
                                </label>
                                <div className="password-field">
                                    <input
                                        type={passwordVisible ? "text" : "password"}
                                        className="form-control"
                                        id="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle" 
                                        onClick={togglePasswordVisibility}
                                    >
                                        <i className={`fas ${passwordVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="login-options">
                                <div className="form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="remember"
                                    />
                                    <label className="form-check-label" htmlFor="remember">
                                        Remember me
                                    </label>
                                </div>
                                
                                <Link to="/forgot-password" className="login-forgot-link">
                                    Forgot password?
                                </Link>
                            </div>
                            
                            <button 
                                type="submit" 
                                className={`btn btn-primary btn-lg login-submit-btn ${loginSuccess ? 'success-btn' : ''}`}
                                disabled={loading || redirecting}
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Logging in...
                                    </>
                                ) : loginSuccess ? (
                                    <>
                                        <i className="fas fa-check"></i>
                                        Success!
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-sign-in-alt"></i>
                                        Log in
                                    </>
                                )}
                            </button>
                            
                            <div className="login-divider">
                                <span>OR</span>
                            </div>
                            
                            <div className="login-social">
                                <button type="button" className="btn btn-outline login-social-btn">
                                    <i className="fab fa-google"></i>
                                    Continue with Google
                                </button>
                                
                                <button type="button" className="btn btn-outline login-social-btn">
                                    <i className="fab fa-facebook-f"></i>
                                    Continue with Facebook
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    <div className="login-form-footer">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/register" className="login-register-link">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage; 