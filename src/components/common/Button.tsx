import { Button as AntdButton } from 'antd';
import { ReactNode } from 'react';

interface ButtonProps {
  onClick?: (e?: any) => void;
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  danger?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  [key: string]: any;
}

const Button = ({
  onClick,
  type = 'default',
  className,
  children,
  disabled,
  icon,
  danger,
  htmlType,
  ...rest
}: ButtonProps) => {
  return (
    <AntdButton
      onClick={onClick}
      type={type}
      className={className}
      disabled={disabled}
      icon={icon}
      danger={danger}
      htmlType={htmlType}
      style={{ borderRadius: '12px', transition: 'all 0.2s' }}
      {...rest}
    >
      {children}
    </AntdButton>
  );
};

export default Button;
