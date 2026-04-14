import React from 'react';
import './styles.css';
interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}
declare const ProfileModal: React.FC<ProfileModalProps>;
export default ProfileModal;
