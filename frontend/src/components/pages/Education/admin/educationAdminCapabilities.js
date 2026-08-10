const TAB_ACCESS = {
  overview: () => true,
  assignments: (caps) => caps.canManageAssignments,
  entities: (caps) => caps.canManageEntities,
  councils: (caps) => caps.isCouncil || caps.canManageEntities || caps.isSecretary,
  posts: (caps) => caps.isManager || caps.canApproveContent || caps.canManageEntities,
  calendar: (caps) => caps.isManager || caps.canManagePartnerEntities || caps.canManageEntities,
  'lesson-assignments': (caps) => caps.canManageLessonAssignments,
  'partner-entities': (caps) => caps.canManagePartnerEntities,
  legislation: (caps) => caps.canManageGlobalLegislation || caps.isCouncil,
  'municipal-plan': (caps) => caps.canManageGlobalLegislation,
  'early-childhood-policy': (caps) => caps.canManageGlobalLegislation,
  'school-menu': (caps) => caps.canManageGlobalLegislation,
}

export function deriveEducationCapabilities(dashboard) {
  const caps = dashboard?.capabilities
  if (caps) return caps

  const assignments = dashboard?.assignments || []
  const roles = assignments.map((a) => a.role)
  const isGlobalAdmin = false
  const isEducationAdmin = roles.includes('education_admin')
  const isSecretary = roles.includes('education_secretary')
  const isManager = roles.includes('education_manager')
  const isCouncil = roles.includes('education_council')

  return {
    isGlobalAdmin,
    isEducationAdmin,
    isSecretary,
    isManager,
    isCouncil,
    canManageAssignments: isEducationAdmin,
    canManageEntities: isEducationAdmin || isSecretary,
    canManageSchoolUnits: isEducationAdmin,
    canManagePartnerEntities: isEducationAdmin || isSecretary,
    canManageGlobalLegislation: isEducationAdmin || isSecretary,
    canApproveContent: isEducationAdmin || isSecretary,
    canManageLessonAssignments: isEducationAdmin || isSecretary || isManager,
  }
}

export function visibleEducationTabs(dashboard) {
  const caps = deriveEducationCapabilities(dashboard)
  return Object.entries(TAB_ACCESS)
    .filter(([, check]) => check(caps))
    .map(([id]) => id)
}

export function canAccessEducationTab(tabId, dashboard) {
  const caps = deriveEducationCapabilities(dashboard)
  const check = TAB_ACCESS[tabId]
  return check ? check(caps) : false
}
