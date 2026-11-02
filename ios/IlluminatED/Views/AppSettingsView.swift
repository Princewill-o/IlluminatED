import SwiftUI

struct AppSettingsView: View {
    @EnvironmentObject private var progress: LocalProgress
    @EnvironmentObject private var platform: PlatformSession
    @EnvironmentObject private var notifications: StudyNotifications
    @AppStorage("reminder.enabled") private var reminderEnabled = false
    @AppStorage("reminder.hour") private var reminderHour = 17
    @AppStorage("reminder.minute") private var reminderMinute = 0
    @State private var scheduling = false
    @State private var clear = false
    @State private var error: String?

    private var reminderDate: Binding<Date> {
        Binding(get: {
            Calendar.current.date(bySettingHour: reminderHour, minute: reminderMinute, second: 0, of: .now) ?? .now
        }, set: { date in
            reminderHour = Calendar.current.component(.hour, from: date)
            reminderMinute = Calendar.current.component(.minute, from: date)
        })
    }

    var body: some View {
        Form {
            Section {
                HStack(spacing: 15) {
                    Image("AppMark").resizable().frame(width: 58, height: 58).clipShape(RoundedRectangle(cornerRadius: 16)).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) { Text("IlluminatED").font(.title3.bold()); Text("Your next chapter.").foregroundStyle(.secondary) }
                }.padding(.vertical, 6)
                Button { platform.open(path: "/me") } label: { Label("My platform account", systemImage: "person.crop.circle") }
            }
            Section {
                Toggle("Daily study reminder", isOn: $reminderEnabled).disabled(scheduling)
                    .onChange(of: reminderEnabled) { _, _ in schedule() }
                DatePicker("A good time for you", selection: reminderDate, displayedComponents: .hourAndMinute)
                    .disabled(!reminderEnabled || scheduling)
                    .onChange(of: reminderHour) { _, _ in if reminderEnabled { schedule() } }
                    .onChange(of: reminderMinute) { _, _ in if reminderEnabled { schedule() } }
                Button("Notification settings") {
                    if let url = URL(string: UIApplication.openNotificationSettingsURLString) { UIApplication.shared.open(url) }
                }
                if let error { Text(error).foregroundStyle(.red).font(.footnote) }
                if notifications.permissionDenied { Text("Notifications are off. You can enable them in iPhone Settings.").font(.footnote).foregroundStyle(.secondary) }
            } header: { Text("A gentle nudge") } footer: { Text("Reminders are optional, scheduled on this iPhone and never sent to our server. Enabling notifications also allows focus completion alerts.") }
            Section("Your account & privacy") {
                Button("Account settings") { platform.open(path: "/dashboard/settings") }
                Button("Delete my platform account", role: .destructive) { platform.open(path: "/dashboard/settings#delete") }
                Button("Privacy policy") { platform.open(path: "/privacy") }
                Button("Your data") { platform.open(path: "/your-data") }
                Button("Terms of use") { platform.open(path: "/terms") }
                Button("Contact & support") { platform.open(path: "/contact") }
            }
            Section {
                Button("Clear offline practice & focus history", role: .destructive) { clear = true }
            } header: { Text("On this iPhone") } footer: { Text("Offline history is device-local and separate from your platform account. Account deletion is managed in account settings. Deleting the online account does not clear this device history.") }
            Section {
                LabeledContent("Version", value: "\(AppConfiguration.version) (\(AppConfiguration.build))")
                Text("Study, work and city progress use your existing online account. A connection is needed for those features. Purchases of digital subscriptions are not offered in this iOS build.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }.navigationTitle("Settings")
        .confirmationDialog("Clear device history?", isPresented: $clear, titleVisibility: .visible) {
            Button("Clear offline history", role: .destructive) { progress.clear(); notifications.cancelFocus() }
        } message: { Text("This removes saved flashcards, offline results and focus history. It leaves your online account intact.") }
    }

    private func schedule() {
        guard !scheduling else { return }
        scheduling = true
        let enabled = reminderEnabled, date = reminderDate.wrappedValue
        Task {
            defer { scheduling = false }
            do { reminderEnabled = try await notifications.setDaily(enabled: enabled, date: date); error = nil }
            catch { reminderEnabled = false; self.error = "The reminder could not be saved. Please try again." }
        }
    }
}
