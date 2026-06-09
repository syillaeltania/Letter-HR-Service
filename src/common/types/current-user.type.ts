import { AppRole } from '../enums/app-role.enum';

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole;
};
