import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface FirstLoginCheckProps {
  children: React.ReactNode;
}

export function FirstLoginCheck({ children }: FirstLoginCheckProps) {
  const { user, loading: authLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkFirstLogin = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_first_login')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking first login status:', error);
          setIsChecking(false);
          return;
        }

        // Check if user needs to change password
        if (profile?.is_first_login === true) {
          setIsFirstLogin(true);
          // Only redirect if not already on change-password page
          if (location.pathname !== '/change-password') {
            navigate('/change-password', { replace: true });
          }
        } else {
          setIsFirstLogin(false);
        }
      } catch (error) {
        console.error('Error checking first login:', error);
      } finally {
        setIsChecking(false);
      }
    };

    if (!authLoading) {
      checkFirstLogin();
    }
  }, [user, authLoading, navigate, location.pathname]);

  // Show loading while checking
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If first login and not on change-password page, block access
  if (isFirstLogin && location.pathname !== '/change-password') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
