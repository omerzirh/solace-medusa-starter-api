
import { ExecArgs } from '@medusajs/framework/types';
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';

export default async function fixTax({ container }: ExecArgs) {
    const taxModule = container.resolve(Modules.TAX);
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info("Resolving tax module...");

    // 1. List Tax Regions
    const taxRegions = await taxModule.listTaxRegions();
    logger.info(`Found ${taxRegions.length} tax regions.`);

    // 2. Ensure "tp_system" is used for regions that have no provider
    // Note: We do not create providers via API as they are usually code-defined or auto-registered.
    // We strictly focus on linking/assigning the provider to the tax region.

    const updates: any[] = [];

    for (const tr of taxRegions) {
        if (!tr.provider_id) {
            logger.info(`Queueing update for tax region ${tr.id} (${tr.country_code}) -> 'tp_system'`);
            updates.push({
                id: tr.id,
                provider_id: "tp_system"
            });
        }
    }

    if (updates.length > 0) {
        logger.info("Applying updates...");
        // updateTaxRegions usually takes an array of updates or single
        // Checking commonly used patterns:
        // If batch update is supported:
        await taxModule.updateTaxRegions(updates);
        logger.info("Updates applied.");
    } else {
        logger.info("No updates needed.");
    }
}
