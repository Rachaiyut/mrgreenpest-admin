

import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

// FIX: Extend React.HTMLAttributes to allow passing standard HTML attributes like 'id'.
// This resolves type errors when using props not explicitly defined in CardProps.
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  className?: string;
}

// Fix: Converted Card to a forwardRef component to allow passing a ref.
// This is necessary for components like `Customers.tsx` that need a reference to the card element for DOM interactions.
// FIX: Added '...rest' to props and spread it on the root div to pass through attributes like 'id'.
export const Card = forwardRef<HTMLDivElement, CardProps>(({ children, className = '', title, actions, ...rest }, ref) => {
  // When a card contains a full-width element like a table, `!p-0` is passed in className.
  // This check prevents the inner div from adding its own padding in that case, fixing a layout bug.
  const hasPadding = !className.includes('!p-0');
  
  return (
    <div ref={ref} className={`bg-white rounded-lg shadow-sm ${className}`} {...rest}>
      {(title || actions) && (
        <div className="px-4 py-3 sm:px-6 border-b border-slate-200 flex justify-between items-center">
          {title && <h3 className="text-lg font-semibold leading-6 text-slate-800">{title}</h3>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={hasPadding ? 'p-4 sm:p-6' : undefined}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';
