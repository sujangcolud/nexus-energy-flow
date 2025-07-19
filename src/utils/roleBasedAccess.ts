// Role-based access control configuration
export type AppRole = "user" | "data_entry" | "reports_viewer" | "super_admin";

export interface TabPermission {
  id: string;
  label: string;
  description: string;
  requiredRoles: AppRole[];
  defaultAccess: boolean;
  category: "data_entry" | "reports" | "admin" | "financial";
}

// Define comprehensive tab permissions
export const TAB_PERMISSIONS: TabPermission[] = [
  // Data Entry Tabs
  {
    id: "orders",
    label: "Orders",
    description: "Manage food orders and restaurant transactions",
    requiredRoles: ["user", "data_entry", "reports_viewer", "super_admin"],
    defaultAccess: true,
    category: "data_entry",
  },
  {
    id: "charging",
    label: "Charging Sessions",
    description: "Track energy consumption and charging station usage",
    requiredRoles: ["user", "data_entry", "reports_viewer", "super_admin"],
    defaultAccess: true,
    category: "data_entry",
  },
  {
    id: "expenses",
    label: "Expenses",
    description: "Monitor business expenses and costs",
    requiredRoles: ["user", "data_entry", "reports_viewer", "super_admin"],
    defaultAccess: true,
    category: "data_entry",
  },
  {
    id: "deposits",
    label: "Deposits",
    description: "Handle financial deposits and incoming funds",
    requiredRoles: ["data_entry", "reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "financial",
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    description: "Process withdrawals and outgoing funds",
    requiredRoles: ["data_entry", "reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "financial",
  },
  {
    id: "cooperative",
    label: "Cooperative Savings",
    description: "Manage community savings and contributions",
    requiredRoles: ["user", "data_entry", "reports_viewer", "super_admin"],
    defaultAccess: true,
    category: "financial",
  },
  {
    id: "share_investments",
    label: "Share Investments",
    description: "Track share investments and portfolio management",
    requiredRoles: ["data_entry", "reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "financial",
  },
  {
    id: "inventory",
    label: "Inventory Management",
    description: "Track inventory, stock levels, and product management",
    requiredRoles: ["user", "data_entry", "reports_viewer", "super_admin"],
    defaultAccess: true,
    category: "data_entry",
  },
  {
    id: "vat_entry",
    label: "VAT Entries",
    description: "Manage VAT entries and tax calculations",
    requiredRoles: ["data_entry", "reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "financial",
  },
  {
    id: "expense_bookings",
    label: "Expense Bookings",
    description: "Advanced expense booking and categorization",
    requiredRoles: ["data_entry", "reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "financial",
  },

  // Reports and Analytics
  {
    id: "insights",
    label: "Business Insights",
    description: "Analytics, insights & visual dashboards",
    requiredRoles: ["reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "reports",
  },
  {
    id: "reports",
    label: "Reports",
    description: "View reports, custom reports and data analysis",
    requiredRoles: ["reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "reports",
  },
  {
    id: "bulk_import",
    label: "Bulk Import",
    description: "Data import & file upload capabilities",
    requiredRoles: ["data_entry", "super_admin"],
    defaultAccess: false,
    category: "data_entry",
  },

  // Administrative Tabs
  {
    id: "menu",
    label: "Menu Setup",
    description: "Manage restaurant menu items and pricing",
    requiredRoles: ["super_admin"],
    defaultAccess: false,
    category: "admin",
  },
  {
    id: "user_management",
    label: "User Management",
    description: "Manage users, roles and permissions",
    requiredRoles: ["super_admin"],
    defaultAccess: false,
    category: "admin",
  },
  {
    id: "calculation_engine",
    label: "Calculation Engine",
    description: "Custom calculations & business formulas",
    requiredRoles: ["reports_viewer", "super_admin"],
    defaultAccess: false,
    category: "admin",
  },
];

// Role hierarchy for access control
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  user: 1,
  data_entry: 2,
  reports_viewer: 3,
  super_admin: 4,
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  user: "Basic user - can access essential data entry features",
  data_entry:
    "Data entry specialist - can access all transaction forms and basic reports",
  reports_viewer:
    "Reports viewer - can access all reports, analytics and insights",
  super_admin:
    "System administrator - full access to all features and user management",
};

// Check if user has access to a specific tab
export function hasTabAccess(userRole: AppRole | null, tabId: string): boolean {
  if (!userRole) return false;

  const tabPermission = TAB_PERMISSIONS.find((tab) => tab.id === tabId);
  if (!tabPermission) return false;

  return tabPermission.requiredRoles.includes(userRole);
}

// Check if user role has required permission level
export function hasRolePermission(
  userRole: AppRole | null,
  requiredRole: AppRole,
): boolean {
  if (!userRole) return false;

  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Get accessible tabs for a user role
export function getAccessibleTabs(userRole: AppRole | null): TabPermission[] {
  if (!userRole) return [];

  return TAB_PERMISSIONS.filter((tab) => hasTabAccess(userRole, tab.id));
}

// Get tabs by category for a user role
export function getTabsByCategory(
  userRole: AppRole | null,
): Record<string, TabPermission[]> {
  const accessibleTabs = getAccessibleTabs(userRole);

  return accessibleTabs.reduce(
    (acc, tab) => {
      if (!acc[tab.category]) {
        acc[tab.category] = [];
      }
      acc[tab.category].push(tab);
      return acc;
    },
    {} as Record<string, TabPermission[]>,
  );
}

// Validate if a user can perform specific actions
export interface ActionPermissions {
  canCreateUsers: boolean;
  canModifyUsers: boolean;
  canDeleteUsers: boolean;
  canViewAllData: boolean;
  canExportData: boolean;
  canModifySettings: boolean;
  canAccessReports: boolean;
  canManagePermissions: boolean;
}

export function getUserActionPermissions(
  userRole: AppRole | null,
): ActionPermissions {
  if (!userRole) {
    return {
      canCreateUsers: false,
      canModifyUsers: false,
      canDeleteUsers: false,
      canViewAllData: false,
      canExportData: false,
      canModifySettings: false,
      canAccessReports: false,
      canManagePermissions: false,
    };
  }

  const permissions: ActionPermissions = {
    canCreateUsers: userRole === "super_admin",
    canModifyUsers: userRole === "super_admin",
    canDeleteUsers: userRole === "super_admin",
    canViewAllData: hasRolePermission(userRole, "reports_viewer"),
    canExportData: hasRolePermission(userRole, "reports_viewer"),
    canModifySettings: userRole === "super_admin",
    canAccessReports: hasRolePermission(userRole, "reports_viewer"),
    canManagePermissions: userRole === "super_admin",
  };

  return permissions;
}

// Default role assignment logic
export function getDefaultRoleForNewUser(): AppRole {
  return "user";
}

// Check if role transition is allowed
export function isRoleTransitionAllowed(
  fromRole: AppRole,
  toRole: AppRole,
  currentUserRole: AppRole,
): boolean {
  // Only super_admin can change roles
  if (currentUserRole !== "super_admin") return false;

  // Super admin can make any role transition
  return true;
}

// Get role-specific dashboard configuration
export interface RoleDashboardConfig {
  showFinancialSummary: boolean;
  showAnalytics: boolean;
  showUserManagement: boolean;
  showSystemSettings: boolean;
  defaultTabs: string[];
}

export function getRoleDashboardConfig(
  userRole: AppRole | null,
): RoleDashboardConfig {
  if (!userRole) {
    return {
      showFinancialSummary: false,
      showAnalytics: false,
      showUserManagement: false,
      showSystemSettings: false,
      defaultTabs: [],
    };
  }

  const config: RoleDashboardConfig = {
    showFinancialSummary: hasRolePermission(userRole, "data_entry"),
    showAnalytics: hasRolePermission(userRole, "reports_viewer"),
    showUserManagement: userRole === "super_admin",
    showSystemSettings: userRole === "super_admin",
    defaultTabs: getAccessibleTabs(userRole)
      .slice(0, 6)
      .map((tab) => tab.id),
  };

  return config;
}
