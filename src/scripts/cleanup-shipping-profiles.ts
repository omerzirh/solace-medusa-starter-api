
import { ExecArgs } from '@medusajs/framework/types';
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { deleteShippingProfileWorkflow, updateShippingOptionsWorkflow, updateProductsWorkflow } from '@medusajs/medusa/core-flows';

export default async function cleanupShippingProfiles({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

    const BAD_PROFILE_ID = 'sp_01KF9N6M3PQGE29EJN1GYBXHV5';
    const BAD_PROFILE_NAME = 'Default Shipping Profile';
    const GOOD_PROFILE_ID = 'sp_01KF9N725VEQ6P9ZHGB2MXCJPF';

    logger.info(`Starting Shipping Profile Cleanup...`);

    // 1. Verify Good Profile Exists
    const goodProfile = await fulfillmentModuleService.retrieveShippingProfile(GOOD_PROFILE_ID).catch(() => null);
    if (!goodProfile) {
        logger.error(`Critical: "Good" profile ${GOOD_PROFILE_ID} not found. Aborting cleanup to prevent data loss.`);
        return;
    }
    logger.info(`Verified target profile: ${goodProfile.name} (${goodProfile.id})`);

    // 2. Check for Bad Profile
    let badProfileId = BAD_PROFILE_ID;
    const badProfile = await fulfillmentModuleService.retrieveShippingProfile(BAD_PROFILE_ID).catch(() => null);

    if (!badProfile) {
        logger.info(`Profile ${BAD_PROFILE_ID} not found. checking by name '${BAD_PROFILE_NAME}' just in case...`);
        const profiles = await fulfillmentModuleService.listShippingProfiles({ name: BAD_PROFILE_NAME });
        if (profiles.length > 0) {
            badProfileId = profiles[0].id;
            logger.info(`Found bad profile by name: ${badProfileId}`);
        } else {
            logger.info(`No duplicate profile found. System is likely already clean.`);
            return;
        }
    }

    // 3. Re-assign any dangling Shipping Options
    const { data: optionsOnBadProfile } = await query.graph({
        entity: "shipping_option",
        fields: ["id", "name"],
        filters: {
            shipping_profile_id: badProfileId
        }
    });

    if (optionsOnBadProfile.length > 0) {
        logger.info(`Found ${optionsOnBadProfile.length} shipping options linked to bad profile. Moving them...`);
        const updates = optionsOnBadProfile.map((so: any) => ({
            id: so.id,
            shipping_profile_id: GOOD_PROFILE_ID
        }));

        try {
            await updateShippingOptionsWorkflow(container).run({ input: updates });
            logger.info(`Successfully moved options: ${optionsOnBadProfile.map((o: any) => o.name).join(', ')}`);
        } catch (e) {
            logger.error(`Failed to move options: ${e.message}`);
            return;
        }
    }

    // 4. Re-assign dangling Products
    // Querying with filters on shipping_profile_id failed, so we fetch and filter in memory.
    const { data: allProducts } = await query.graph({
        entity: "product",
        fields: ["id", "title", "shipping_profile_id"],
    });

    const productsOnBadProfile = allProducts.filter((p: any) => p.shipping_profile_id === badProfileId);

    if (productsOnBadProfile.length > 0) {
        logger.info(`Found ${productsOnBadProfile.length} products linked to bad profile. Moving them...`);

        const productUpdates = productsOnBadProfile.map((p: any) => ({
            id: p.id,
            shipping_profile_id: GOOD_PROFILE_ID
        }));

        try {
            await updateProductsWorkflow(container).run({
                input: { products: productUpdates }
            });
            logger.info(`Successfully moved ${productUpdates.length} products to valid profile.`);
        } catch (e) {
            logger.error(`Failed to move products: ${e.message}`);
            return;
        }
    } else {
        logger.info("No products linked to the bad profile.");
    }

    // 5. Delete the Bad Profile
    logger.info(`Deleting duplicate profile: ${badProfileId}...`);
    try {
        await deleteShippingProfileWorkflow(container).run({
            input: { ids: [badProfileId] }
        });
        logger.info("Successfully deleted duplicate profile.");
    } catch (e) {
        logger.error(`Failed to delete profile: ${e.message}`);
    }
}
