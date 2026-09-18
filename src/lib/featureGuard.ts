import prisma from './prisma';

export const PLAN_HIERARCHY = {
  BASIC: 1,
  ADVANCE: 2,
  PRO: 3
} as const;

export type PlanTier = keyof typeof PLAN_HIERARCHY;

/**
 * Validates if a tenant has access to a specific feature tier.
 * Throws an Error if the tenant is unauthorized or lacks the required plan.
 * Use this in Next.js Server Actions or Route Handlers.
 */
export async function requirePlan(tenantId: string, requiredPlan: PlanTier) {
  if (!tenantId) {
    throw new Error('Unauthorized: No tenant context');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, isActive: true }
  });

  if (!tenant || !tenant.isActive) {
    throw new Error('Tenant inactive or not found');
  }

  const currentTier = PLAN_HIERARCHY[tenant.plan as PlanTier] || 0;
  const requiredTier = PLAN_HIERARCHY[requiredPlan];

  if (currentTier < requiredTier) {
    throw new Error(`Feature Locked: Requires ${requiredPlan} plan.`);
  }

  return true;
}

/**
 * Non-throwing version for UI conditionally rendering in Server Components.
 */
export async function hasPlanAccess(tenantId: string, requiredPlan: PlanTier) {
  try {
    await requirePlan(tenantId, requiredPlan);
    return true;
  } catch {
    return false;
  }
}
