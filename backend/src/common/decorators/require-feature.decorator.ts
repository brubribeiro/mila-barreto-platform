import { SetMetadata } from '@nestjs/common';

import type { PlatformFeature } from '../platform-features';

export const FEATURE_KEY = 'requiredFeature';

/** Exige o módulo no plano efetivo da clínica (FeatureGuard). Rotas /admin não usam. */
export const RequireFeature = (feature: PlatformFeature) => SetMetadata(FEATURE_KEY, feature);
