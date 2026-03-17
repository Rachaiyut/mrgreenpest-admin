import { Children, isValidElement } from 'react';
import type {
  FC,
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ButtonHTMLAttributes,
} from 'react';
import ButtonUI from './Button';

export const FormField: FC<{
  label: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}> = ({ label, children, htmlFor, className }) => {
  const isRequired = Children.toArray(children).some(
    // FIX: Property 'required' does not exist on type 'unknown'. Cast child.props to any to check for the required prop.
    (child) => isValidElement(child) && (child.props as any).required
  );

  let labelContent: ReactNode = label;
  // If the child is required, but the label doesn't manually have a *, add a red one.
  if (isRequired && !label.endsWith('*')) {
    labelContent = (
      <>
        {label}
        <span className="text-red-500">*</span>
      </>
    );
  }
  // If the label manually has a *, render it as red. This covers cases where auto-detection fails (like with complex children).
  else if (label.endsWith('*')) {
    labelContent = (
      <>
        {label.slice(0, -1)}
        <span className="text-red-500">*</span>
      </>
    );
  }

  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700 mb-1"
      >
        {labelContent}
      </label>
      {children}
    </div>
  );
};

export const Input: FC<InputHTMLAttributes<HTMLInputElement>> = (props) => {
  // Ensure value is never undefined/null for controlled inputs to prevent React warning
  // If the user explicitly provides a 'value' prop, we must ensure it's not undefined
  // If they provide 'defaultValue', it's uncontrolled, so we don't interfere
  const controlledProps = 'value' in props ? { value: props.value ?? '' } : {};

  return (
    <input
      {...props}
      {...controlledProps}
      className={`w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 text-slate-900 ${
        props.type === 'search' ? 'pl-10' : '' // Add padding for search icon
      }`}
    />
  );
};

export const Select: FC<SelectHTMLAttributes<HTMLSelectElement>> = (props) => {
  const controlledProps = 'value' in props ? { value: props.value ?? '' } : {};
  return (
    <select
      {...props}
      {...controlledProps}
      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 text-slate-900"
    />
  );
};

export const Textarea: FC<TextareaHTMLAttributes<HTMLTextAreaElement>> = (
  props
) => {
  const controlledProps = 'value' in props ? { value: props.value ?? '' } : {};
  return (
    <textarea
      {...props}
      {...controlledProps}
      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm text-slate-900"
      rows={3}
    />
  );
};

export const Button: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?:
      | 'primary'
      | 'secondary'
      | 'destructive'
      | 'accent'
      | 'ghost'
      | 'outline'
      | 'icon';
    icon?: ReactNode;
  }
> = ({ variant = 'primary', className, children, icon, ...rest }) => {
  let type: 'primary' | 'default' | 'dashed' | 'text' | 'link' = 'default';
  let danger = false;

  switch (variant) {
    case 'primary':
      type = 'primary';
      break;
    case 'secondary':
      type = 'default';
      break;
    case 'destructive':
      type = 'primary';
      danger = true;
      break;
    case 'accent':
      type = 'primary';
      break;
    case 'ghost':
      type = 'text';
      break;
    case 'outline':
      type = 'default';
      break;
    case 'icon':
      type = 'text';
      break;
    default:
      type = 'default';
  }

  const { type: htmlButtonType, onClick, disabled, ...passThrough } = rest;

  return (
    <ButtonUI
      type={type}
      danger={danger}
      className={className}
      disabled={disabled}
      icon={icon}
      onClick={onClick as any}
      htmlType={htmlButtonType as any}
      {...passThrough}
    >
      {children}
    </ButtonUI>
  );
};

export const SectionTitle: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h4
    className={`text-base font-semibold text-slate-800 mb-3 ${className || ''}`}
  >
    {children}
  </h4>
);

export const DetailsList: FC<{
  cols?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}> = ({ cols = 1, className, children }) => {
  const gridColsClass =
    cols === 1
      ? 'md:grid-cols-1'
      : cols === 2
        ? 'md:grid-cols-2'
        : cols === 3
          ? 'md:grid-cols-3'
          : 'md:grid-cols-4';
  return (
    <dl
      className={`grid grid-cols-1 ${gridColsClass} gap-x-4 gap-y-4 ${className || ''}`}
    >
      {children}
    </dl>
  );
};

export const DetailsItem: FC<{
  label: string;
  value?: ReactNode;
  valueClassName?: string;
  children?: ReactNode;
}> = ({ label, value, valueClassName, children }) => (
  <div>
    <dt className="font-medium text-slate-500">{label}</dt>
    <dd className={`mt-1 text-slate-900 ${valueClassName || ''}`}>
      {children ?? value}
    </dd>
  </div>
);

export const Radio: FC<InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <input
      {...props}
      type="radio"
      className={`h-4 w-4 border-slate-300 text-primary focus:ring-primary ${className}`}
    />
  );
};
