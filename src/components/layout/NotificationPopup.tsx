import { Modal } from 'antd';

interface NotificationPopupProps {
  notification: {
    title: string;
    message: string;
  } | null;
  onClose: () => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose }) => {
  return (
    <Modal
      title={notification?.title}
      open={!!notification}
      onOk={onClose}
      onCancel={onClose}
      okText="Close"
    >
      <p>{notification?.message}</p>
    </Modal>
  );
};
