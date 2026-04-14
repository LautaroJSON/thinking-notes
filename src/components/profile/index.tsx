import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useAuthentication from '@/hooks/useAuthentication';
import './styles.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthentication();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        <div className="profile-modal-body">
          {user && (
            <>
              <img
                src={user.user_metadata?.picture || '/default-avatar.png'}
                alt="Profile"
                className="profile-avatar"
              />
              <h2 className="profile-name">
                {user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario'}
              </h2>
              <p className="profile-email">{user.email}</p>
              <button className="profile-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileModal;