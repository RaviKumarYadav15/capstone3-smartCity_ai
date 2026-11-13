import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    openAuthModal();
    navigate('/', { replace: true });
  }, [openAuthModal, navigate]);

  return null;
}

