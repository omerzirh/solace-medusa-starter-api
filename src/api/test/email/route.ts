import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const notificationModuleService: INotificationModuleService = req.scope.resolve(
        Modules.NOTIFICATION
    )

    const to = (req.query.to as string) || "oturumbeles@gmail.com"

    try {
        // Using user-invited template as we confirmed it exists in the system
        await notificationModuleService.createNotifications({
            to: to,
            channel: "email",
            template: "user-invited",
            data: {
                invite_url: "http://localhost:7001/invite?token=test-token", // Dummy data required by the template
            },
        })

        res.json({
            success: true,
            message: `Email sent to ${to}`,
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to send email",
            error: error.message,
        })
    }
}
