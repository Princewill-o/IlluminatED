import SwiftUI
import UserNotifications

@main
struct IlluminatEDApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var progress = LocalProgress()
    @StateObject private var library = RevisionLibrary()
    @StateObject private var notifications = StudyNotifications()
    @StateObject private var platform = PlatformSession()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(progress)
                .environmentObject(library)
                .environmentObject(notifications)
                .environmentObject(platform)
                .tint(.blue)
                .onOpenURL { url in
                    if let destination = AppConfiguration.policy.deepLink(url) { platform.open(destination) }
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        progress.completeFocusIfNeeded()
                        if platform.presented { platform.resumeMedia() }
                    }
                    if phase != .active { platform.pauseMedia() }
                }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
}
