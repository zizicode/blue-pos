
import { app } from 'electron'

export const appController = {
    getVersion() {
        return { success: true, version: app.getVersion() }
    }
}
