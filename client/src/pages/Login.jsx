import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { openAuthModal, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    } else {
      openAuthModal();
      navigate('/', { replace: true });
    }
  }, [openAuthModal, navigate, user]);

  return null;
}

