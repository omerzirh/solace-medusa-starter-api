
import { ExecArgs } from '@medusajs/framework/types';
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';

export default async function updateRegionPayments({ container }: ExecArgs) {
    const regionService = container.resolve(Modules.REGION);
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    const regions = await regionService.listRegions();

    for (const region of regions) {
        logger.info(`Updating payment providers for region: ${region.name} (${region.id})`);

        // In Medusa 2.0, we use Remote Links to associate Regions with Payment Providers.
        // We want to ensure 'pp_system_default' and 'pp_stripe_stripe' are linked.

        const providers = ['pp_system_default', 'pp_stripe_stripe'];

        for (const providerId of providers) {
            try {
                await remoteLink.create({
                    [Modules.REGION]: {
                        region_id: region.id,
                    },
                    [Modules.PAYMENT]: {
                        payment_provider_id: providerId,
                    },
                });
                logger.info(` - Linked provider ${providerId} to region ${region.id}`);
            } catch (error) {
                // Ignore if already exists or log warning
                logger.warn(` - Failed to link ${providerId} (might already exist): ${error.message}`);
            }
        }

        logger.info(`Finished updating region ${region.id}.`);
    }
}
