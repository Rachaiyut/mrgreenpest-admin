import { FC } from 'react';

// Enum
import { Role } from '@/src/types/enums/role';

import { Page } from '@/src/types/page';

export interface NavLink {
  type: 'link';
  name: Page;
  icon: FC<any>;
  roles?: Role[];
  access?: string;
}

export interface NavGroup {
  type: 'group';
  name: string;
  icon: FC<any>;
  subItems: { name: Page; icon?: FC<any>; roles?: Role[]; access?: string }[];
  roles?: Role[];
}

