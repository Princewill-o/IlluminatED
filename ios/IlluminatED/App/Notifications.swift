import SwiftUI
import UserNotifications

@MainActor
final class StudyNotifications: ObservableObject {
    @Published var permissionDenied = false
    private let center = UNUserNotificationCenter.current()
    private var activeFocusID: UUID?
    static let reminderID = "illuminated.daily-study"
    static let focusID = "illuminated.focus-end"

    func setDaily(enabled: Bool, date: Date) async throws -> Bool {
        center.removePendingNotificationRequests(withIdentifiers: [Self.reminderID])
        guard enabled else { return false }
        let accepted = try await center.requestAuthorization(options: [.alert, .sound])
        permissionDenied = !accepted
        guard accepted else { return false }
        let content = UNMutableNotificationContent()
        content.title = "A little progress, every day"
        content.body = "Ready for five questions? Your next chapter starts with a small step."
        content.sound = .default
        let components = Calendar.current.dateComponents([.hour, .minute], from: date)
        try await center.add(UNNotificationRequest(identifier: Self.reminderID, content: content,
            trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true)))
        return true
    }

    func scheduleFocus(_ session: FocusSession) async {
        activeFocusID = session.id
        center.removePendingNotificationRequests(withIdentifiers: [Self.focusID])
        let settings = await center.notificationSettings()
        guard activeFocusID == session.id,
              settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
        let content = UNMutableNotificationContent()
        content.title = "Time for a breather"
        content.body = "Your focus session is complete. Take a break before your next step."
        content.sound = .default
        try? await center.add(UNNotificationRequest(identifier: Self.focusID, content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: max(1, session.ends.timeIntervalSinceNow), repeats: false)))
    }

    func cancelFocus() { activeFocusID = nil; center.removePendingNotificationRequests(withIdentifiers: [Self.focusID]) }

    func cancelAll() {
        activeFocusID = nil
        center.removePendingNotificationRequests(withIdentifiers: [Self.focusID, Self.reminderID])
        center.removeDeliveredNotifications(withIdentifiers: [Self.focusID, Self.reminderID])
    }
}
