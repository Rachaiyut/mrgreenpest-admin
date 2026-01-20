import { FC } from 'react';

// Enum
import { Role } from '../../enum/role.enum';

import { Page } from '../../../router/page';

export interface NavLink {
  type: 'link';
  name: Page;
  icon: FC<any>;
  roles?: Role[];
}

export interface NavGroup {
  type: 'group';
  name: string;
  icon: FC<any>;
  subItems: { name: Page; icon?: FC<any>; roles?: Role[] }[];
  roles?: Role[];
}
