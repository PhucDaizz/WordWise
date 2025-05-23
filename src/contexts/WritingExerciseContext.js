import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

// Create Context
const WritingExerciseContext = createContext();

// Custom Hook for using WritingExercise Context
export const useWritingExercise = () => useContext(WritingExerciseContext);

// WritingExercise Provider Component
export const WritingExerciseProvider = ({ children }) => {
  const [writingExercises, setWritingExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { accessToken, refreshAccessToken, isAuthenticated, checkTokenExpiration, handleAuthError } = useAuth();
  
  // Log when the provider mounts
  useEffect(() => {
    console.log("WritingExerciseProvider mounted");
    return () => console.log("WritingExerciseProvider unmounted");
  }, []);
  
  // Get API URL from environment variables or use ngrok URL from Postman request
  const baseUrl = process.env.REACT_APP_API_URL || 'https://6d2c-115-76-51-131.ngrok-free.app';
  // Remove trailing /api if it exists
  const API_URL = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
  
  // Log URL API
  useEffect(() => {
    console.log('WritingExerciseContext using API URL:', API_URL);
  }, [API_URL]);

  // Helper function to handle API requests with token refresh
  const apiRequest = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize headers if not present
      if (!options.headers) {
        options.headers = {};
      }
      
      // Add ngrok header to bypass warning page
      options.headers['ngrok-skip-browser-warning'] = 'true';
      options.headers['Accept'] = 'application/json';
      
      // Check token validity before making request
      const isTokenValid = await checkTokenExpiration();
      if (!isTokenValid) {
        console.log('Token invalid or expired before API request');
        throw new Error('Authentication required');
      }
      
      // Try to use current token from localStorage
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken) {
        console.log('Using token from localStorage');
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${currentToken}`
        };
      } else {
        console.log('No token in localStorage');
        throw new Error('Authentication required');
      }
      
      console.log(`Making request to: ${url}`);
      console.log('Request options:', JSON.stringify(options, null, 2));
      
      // Make the request
      let response = await fetch(url, options);
      
      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        console.log(`Auth error ${response.status} from ${url}`);
        // Try to refresh the token
        await handleAuthError(response.status);
        throw new Error('Authentication error');
      }
      
      // Check for non-JSON responses
      const contentType = response.headers.get('content-type');
      console.log(`Response content type: ${contentType}`);
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = 'An unexpected error occurred'; // Default fallback
        let errorBody = null;
        const status = response.status;

        try {
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                // Lưu ý: Sử dụng .clone() vì body chỉ đọc được 1 lần
                const responseClone = response.clone();
                try {
                    errorBody = await responseClone.json();
                    console.error(`Parsed JSON error body (Status ${status}):`, errorBody);

                    // Attempt to extract message from common JSON error structures
                    errorMessage = errorBody.message // Common simple message property
                                 || errorBody.title // Problem Details title
                                 || errorBody.detail // Problem Details detail
                                 || (typeof errorBody === 'string' ? errorBody : null) // Direct string JSON
                                 || (Array.isArray(errorBody) && errorBody.length > 0 ? errorBody[0] : null) // Array of strings
                                 || (errorBody.errors && Object.values(errorBody.errors).flat()[0]) // ASP.NET Core Validation errors
                                 || `Request failed with status ${status} (Unrecognized JSON structure)`; // Fallback for JSON

                } catch (jsonParseError) {
                     // Nếu không parse được JSON dù Content-Type là JSON
                     console.error('Failed to parse JSON error body, reading as text:', jsonParseError);
                     const textBody = await response.text(); // Đọc body gốc (đã đọc 1 lần, cần clone nếu không muốn dùng lại)
                     errorMessage = textBody || `Request failed with status ${status} (JSON parse error)`;
                     console.error('Non-JSON content in JSON response:', textBody.substring(0, 200));
                }

            } else {
                // Handle non-JSON responses (often plain text errors)
                const textBody = await response.text();
                errorMessage = textBody || `Request failed with status: ${status}`;
                console.error(`Non-JSON error response (Status ${status}):`, textBody.substring(0, 200));
            }
        } catch (readBodyError) {
            console.error('Error reading response body:', readBodyError);
            errorMessage = `Request failed with status: ${status} (Failed to read body)`; // Fallback if reading body fails
        }

        // Ensure errorMessage is a string
        if (typeof errorMessage !== 'string') {
            errorMessage = 'An unexpected error occurred (Invalid message format)';
        }


        // Create custom error with response details
        const error = new Error(errorMessage);
        error.response = { // Attach response details
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            // body: errorBody // Optional: attach the parsed body if needed elsewhere
        };
        error.status = response.status; // Also attach status directly for easier access

        console.error('Throwing custom error:', error);
        throw error; // Throw the custom error
      }
      
      // For successful response, handle no-content and parse JSON
      if (response.status === 204) {
        return null;
      }
      
      try {
        const jsonResult = await response.json();
        console.log('JSON response:', jsonResult);
        return jsonResult;
      } catch (jsonError) {
        console.error('Error parsing JSON from response:', jsonError);
        const rawText = await response.text();
        console.error(`Response content (first 200 chars): ${rawText.substring(0, 200)}`);
        throw new Error('Failed to parse JSON response from server');
      }
    } catch (err) {
      console.error('API Request Error:', err);
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to handle public API requests (no authentication required)
  const publicApiRequest = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize headers if not present
      if (!options.headers) {
        options.headers = {};
      }
      
      // Add ngrok header to bypass warning page
      options.headers['ngrok-skip-browser-warning'] = 'true';
      options.headers['Accept'] = 'application/json';
      
      console.log(`Making public request to: ${url}`);
      console.log('Request options:', JSON.stringify(options, null, 2));
      
      // Make the request
      let response = await fetch(url, options);
      
      // Check for non-JSON responses
      const contentType = response.headers.get('content-type');
      console.log(`Response content type: ${contentType}`);
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = '';
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.title || 'An error occurred';
            console.error('Error response:', errorData);
          } else {
            // For non-JSON errors
            errorMessage = `Request failed with status: ${response.status}`;
            const text = await response.text();
            console.error('Non-JSON error response:', text.substring(0, 200));
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorMessage = `Request failed with status: ${response.status}`;
        }
        
        // Create custom error with response details
        const error = new Error(errorMessage);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        };
        
        throw error;
      }
      
      // For successful response, handle no-content and parse JSON
      if (response.status === 204) {
        return null;
      }
      
      try {
        const jsonResult = await response.json();
        console.log('JSON response:', jsonResult);
        return jsonResult;
      } catch (jsonError) {
        console.error('Error parsing JSON from response:', jsonError);
        const rawText = await response.text();
        console.error(`Response content (first 200 chars): ${rawText.substring(0, 200)}`);
        throw new Error('Failed to parse JSON response from server');
      }
    } catch (err) {
      console.error('Public API Request Error:', err);
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all writing exercises for a user
  const getAllWritingExercises = useCallback(async (userId = null, page = 1, itemPerPage = 5) => {
    try {
      console.log("getAllWritingExercises called with:", { userId, page, itemPerPage });
      // If userId is not provided, try to get it from localStorage
      let userIdToUse = userId;
      if (!userIdToUse) {
        try {
          // First try to get directly from userId key
          const directUserId = localStorage.getItem('userId');
          if (directUserId) {
            userIdToUse = directUserId;
            console.log('Using userId directly from localStorage:', userIdToUse);
          }
          // If not found, try from userData object
          else {
            const userDataString = localStorage.getItem('userData');
            if (userDataString) {
              const userData = JSON.parse(userDataString);
              userIdToUse = userData.userId;
              console.log('Using userId from userData in localStorage:', userIdToUse);
            }
          }
        } catch (parseError) {
          console.error('Error accessing/parsing userData from localStorage:', parseError);
        }
      }
      
      if (!userIdToUse) {
        console.log('No userId available, returning empty array');
        setWritingExercises([]);
        return { writingExcercises: [], totalPage: 1, curentPage: 1, itemPerPage }; // Match API response spelling
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('itemPerPage', itemPerPage);
      
      const requestUrl = `${API_URL}/api/WritingExercise/GetAll/${userIdToUse}?${queryParams.toString()}`;
      console.log(`Fetching writing exercises for user ${userIdToUse}: ${requestUrl}`);
      
      const result = await apiRequest(requestUrl);
      console.log('API returned result:', result); // Log full response for debugging
      
      // Update state with writing exercises data
      if (result) {
        // Use the proper API response structure according to documentation
        setWritingExercises(result.writingExcercises || []); // Match API response spelling with "cer" not "ces"
        setCurrentPage(result.curentPage || 1);
        setTotalPages(result.totalPage || 1);
        setItemsPerPage(result.itemPerPage || 5);
        
        console.log('Writing exercises loaded:', {
          count: result.writingExcercises?.length || 0, // Match API response spelling
          currentPage: result.curentPage,
          totalPages: result.totalPage
        });
        
        return result;
      }
      
      return null;
    } catch (err) {
      console.error('Error getting writing exercises:', err);
      setError('Failed to load writing exercises. Please try again later.');
      throw err;
    }
  }, [API_URL, apiRequest]);

  // Get public writing exercises for exploration (no auth required)
  const explorePublicWritingExercises = useCallback(async ({
    learningLanguage = '',
    nativeLanguage = '',
    page = 1,
    itemPerPage = 20
  }) => {
    try {
      console.log("explorePublicWritingExercises called with:", { 
        learningLanguage, nativeLanguage, page, itemPerPage 
      });
      
      setLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('itemPerPage', itemPerPage);
      
      if (learningLanguage) {
        queryParams.append('learningLanguage', learningLanguage);
      }
      
      if (nativeLanguage) {
        queryParams.append('nativeLanguage', nativeLanguage);
      }
      
      const requestUrl = `${API_URL}/api/WritingExercise/Explore?${queryParams.toString()}`;
      console.log(`Exploring public writing exercises: ${requestUrl}`);
      
      // Use publicApiRequest since this doesn't require authentication
      const result = await publicApiRequest(requestUrl);
      console.log('Explore API returned result:', result);
      
      if (result) {
        // Return the result directly
        return {
          exercises: result.exercises || [],
          currentPage: result.currentPage || 1,
          totalPages: result.totalPages || 1,
          itemPerPage: result.itemPerPage || itemPerPage
        };
      }
      
      return {
        exercises: [],
        currentPage: 1,
        totalPages: 1,
        itemPerPage
      };
    } catch (err) {
      console.error('Error exploring public writing exercises:', err);
      setError('No discussion posts are made public');
      return {
        exercises: [],
        currentPage: 1,
        totalPages: 1,
        itemPerPage
      };
    } finally {
      setLoading(false);
    }
  }, [API_URL, publicApiRequest]);

  // Get a specific writing exercise by ID
  const getWritingExerciseById = useCallback(async (exerciseId) => {
    try {
      console.log(`Attempting to get writing exercise with ID: ${exerciseId}`);
      // Thử một số cách định dạng URL khác nhau bằng cách bắt lỗi và thử lại
      try {
        // Cách 1: sử dụng endpoint /detail?id=
        const result = await apiRequest(`${API_URL}/api/WritingExercise/detail?id=${exerciseId}`);
        console.log('Writing exercise detail retrieved:', result);
        return result;
      } catch (initialError) {
        console.warn(`First endpoint failed with: ${initialError.message}, trying alternative endpoint...`);
        
        try {
          // Cách 2: sử dụng đường dẫn trực tiếp /{id}
          const result = await apiRequest(`${API_URL}/api/WritingExercise/${exerciseId}`);
          console.log('Writing exercise detail retrieved from alternative endpoint:', result);
          return result;
        } catch (secondError) {
          console.warn(`Second endpoint failed with: ${secondError.message}, trying GetById endpoint...`);
          
          // Cách 3: sử dụng endpoint /GetById/{id}
          const result = await apiRequest(`${API_URL}/api/WritingExercise/GetById/${exerciseId}`);
          console.log('Writing exercise detail retrieved from GetById endpoint:', result);
          return result;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch writing exercise ${exerciseId}:`, err);
      toast.error(`Error loading writing exercise: ${err.message}`);
      throw err;
    }
  }, [API_URL, apiRequest]);

  // Value object to be provided by context
  const contextValue = {
    writingExercises,
    loading,
    error,
    totalPages,
    currentPage,
    itemsPerPage,
    getAllWritingExercises,
    getWritingExerciseById,
    explorePublicWritingExercises
  };

  // Auto generate writing exercise topic with AI
  const autoGenerateWritingExercise = useCallback(async (learningLanguage, nativeLanguage, title) => {
    try {
      console.log(`Attempting to auto-generate writing exercise with languages: ${learningLanguage}, ${nativeLanguage}, title: ${title}`);
      
      const requestUrl = `${API_URL}/api/WritingExercise/AutoGenerate`;
      console.log(`Making request to: ${requestUrl}`);
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          learningLanguage,
          nativeLanguage,
          title: title || undefined // Only include if provided
        })
      };
      
      const result = await apiRequest(requestUrl, options);
      console.log('AI generated writing exercise:', result);
      
      // Refresh the list after generation
      if (result && result.userId) {
        await getAllWritingExercises(result.userId);
      }
      
      return result;
    } catch (err) {
      console.error('Failed to generate writing exercise with AI:', err);
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (err.response?.status === 400) {
        if (err.message.includes('API key')) {
          toast.error('A valid Gemini API key is required. Please add your API key in the settings.');
        } else {
          toast.error(`Error: ${err.message}`);
        }
      } else {
        toast.error(`Error generating writing exercise: ${err.message}`);
      }
      
      throw err;
    }
  }, [API_URL, apiRequest, getAllWritingExercises]);

  // Update the context value to include the new function
  const updatedContextValue = {
    ...contextValue,
    autoGenerateWritingExercise
  };

  // Log when dependencies change
  useEffect(() => {
    console.log('WritingExerciseContext dependencies changed:', {
      writingExercises,
      loading,
      error,
      totalPages,
      currentPage,
      itemsPerPage,
      getAllWritingExercises,
      getWritingExerciseById,
      autoGenerateWritingExercise
    });
  }, [writingExercises, loading, error, totalPages, currentPage, itemsPerPage, getAllWritingExercises, getWritingExerciseById, autoGenerateWritingExercise]);

  return (
    <WritingExerciseContext.Provider value={updatedContextValue}>
      {children}
    </WritingExerciseContext.Provider>
  );
}; 