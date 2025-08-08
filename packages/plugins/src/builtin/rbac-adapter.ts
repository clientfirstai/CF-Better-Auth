import type { Plugin, PluginAdapter } from '../plugin-adapter';
import type { BetterAuthInstance } from '@cf-auth/types';

export interface RBACConfig {
  roles: {
    [key: string]: {
      name: string;
      permissions: string[];
      inherits?: string[];
    };
  };
  defaultRole?: string;
  superAdminRole?: string;
}

export const rbacAdapter: PluginAdapter = {
  name: 'rbac',
  
  fromBetterAuth: (betterAuthPlugin: any): Plugin => {
    return {
      name: 'rbac',
      init: async (auth: BetterAuthInstance) => {
        if (typeof betterAuthPlugin === 'function') {
          const instance = betterAuthPlugin(auth);
          if (auth.use) {
            auth.use(instance);
          }
        } else {
          if (auth.use) {
            auth.use(betterAuthPlugin);
          }
        }
      }
    };
  },
  
  toBetterAuth: (plugin: Plugin): any => {
    return plugin.config || {};
  }
};

export function createRBACPlugin(config: RBACConfig): Plugin {
  const roleHierarchy = buildRoleHierarchy(config.roles);
  
  return {
    name: 'rbac',
    config,
    init: async (auth: BetterAuthInstance) => {
      const rbacHandlers = {
        assignRole: async (userId: string, role: string) => {
          if (!config.roles[role]) {
            throw new Error(`Role ${role} does not exist`);
          }
          return { userId, role };
        },
        
        removeRole: async (userId: string, role: string) => {
          return { userId, role, removed: true };
        },
        
        getUserRoles: async (userId: string) => {
          return [config.defaultRole || 'user'];
        },
        
        hasPermission: async (userId: string, permission: string) => {
          const roles = await rbacHandlers.getUserRoles(userId);
          return hasPermissionInRoles(roles, permission, roleHierarchy);
        },
        
        hasRole: async (userId: string, role: string) => {
          const roles = await rbacHandlers.getUserRoles(userId);
          return roles.includes(role);
        },
        
        getAllPermissions: async (userId: string) => {
          const roles = await rbacHandlers.getUserRoles(userId);
          return getAllPermissionsForRoles(roles, roleHierarchy);
        }
      };
      
      if (auth.registerRBAC) {
        auth.registerRBAC(rbacHandlers);
      }
      
      if (auth.use) {
        auth.use(createRBACMiddleware(rbacHandlers));
      }
    }
  };
}

function buildRoleHierarchy(roles: RBACConfig['roles']): Map<string, Set<string>> {
  const hierarchy = new Map<string, Set<string>>();
  
  for (const [key, role] of Object.entries(roles)) {
    const permissions = new Set(role.permissions);
    
    if (role.inherits) {
      for (const inherited of role.inherits) {
        const inheritedRole = roles[inherited];
        if (inheritedRole) {
          inheritedRole.permissions.forEach(p => permissions.add(p));
        }
      }
    }
    
    hierarchy.set(key, permissions);
  }
  
  return hierarchy;
}

function hasPermissionInRoles(
  roles: string[],
  permission: string,
  hierarchy: Map<string, Set<string>>
): boolean {
  for (const role of roles) {
    const permissions = hierarchy.get(role);
    if (permissions?.has(permission)) {
      return true;
    }
  }
  return false;
}

function getAllPermissionsForRoles(
  roles: string[],
  hierarchy: Map<string, Set<string>>
): string[] {
  const allPermissions = new Set<string>();
  
  for (const role of roles) {
    const permissions = hierarchy.get(role);
    if (permissions) {
      permissions.forEach(p => allPermissions.add(p));
    }
  }
  
  return Array.from(allPermissions);
}

function createRBACMiddleware(handlers: any) {
  return async (context: any, next: () => Promise<any>) => {
    if (context.user) {
      context.hasPermission = (permission: string) => 
        handlers.hasPermission(context.user.id, permission);
      context.hasRole = (role: string) => 
        handlers.hasRole(context.user.id, role);
    }
    
    return next();
  };
}