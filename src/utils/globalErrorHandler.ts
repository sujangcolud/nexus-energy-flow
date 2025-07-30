import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let errorHandlerSetup = false;

export const setupGlobalAuthErrorHandler = () => {
  if (errorHandlerSetup) return;
  
  // Handle unhandled promise rejections that might be auth-related
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error && typeof error === 'object') {
      const errorMessage = error.message || error.toString();
      
      // Check if this is a Supabase auth error
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('refresh_token_not_found') ||
        errorMessage.includes('Refresh Token Not Found') ||
        error.name === 'AuthApiError'
      ) {
        console.log('Global handler: Detected auth error, handling gracefully');
        
        // Prevent the error from being logged to console
        event.preventDefault();
        
        // Clear any stored auth tokens
        try {
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          
          // Sign out to clean up
          supabase.auth.signOut().catch(console.error);
          
          // Show user-friendly message (only once per session)
          if (!sessionStorage.getItem('auth_error_shown')) {
            toast.info('Your session has expired. Please sign in again.');
            sessionStorage.setItem('auth_error_shown', 'true');
          }
        } catch (cleanupError) {
          console.error('Error during auth cleanup:', cleanupError);
        }
      }
    }
  });
  
  // Handle general errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    if (error && typeof error === 'object') {
      const errorMessage = error.message || error.toString();
      
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('refresh_token_not_found') ||
        errorMessage.includes('Refresh Token Not Found')
      ) {
        console.log('Global error handler: Detected auth error');
        
        // Prevent default error handling
        event.preventDefault();
        
        // Clear auth data
        try {
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          supabase.auth.signOut().catch(console.error);
        } catch (cleanupError) {
          console.error('Error during auth cleanup:', cleanupError);
        }
      }
    }
  });
  
  errorHandlerSetup = true;
  console.log('Global auth error handler setup complete');
};

export const clearAuthErrorFlag = () => {
  sessionStorage.removeItem('auth_error_shown');
};
