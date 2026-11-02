import SwiftUI

struct FocusView: View {
    @EnvironmentObject private var progress: LocalProgress
    @EnvironmentObject private var notifications: StudyNotifications
    @State private var minutes = 15
    @State private var cancel = false
    @State private var message: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 26) {
                Text("ONE THING AT A TIME").font(.caption.weight(.semibold)).tracking(1.5).foregroundStyle(.secondary)
                Text("Make a little space.").font(.largeTitle.bold()).multilineTextAlignment(.center)
                Text("A quiet timer for revision, reading, or a small step you’ve been putting off.")
                    .foregroundStyle(.secondary).multilineTextAlignment(.center)
                if let session = progress.focus {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        let remaining = session.remaining(at: context.date)
                        ZStack {
                            Circle().stroke(AppDesign.purple.opacity(0.12), lineWidth: 12)
                            Circle().trim(from: 0, to: Double(remaining) / Double(session.minutes * 60))
                                .stroke(AppDesign.purple, style: StrokeStyle(lineWidth: 12, lineCap: .round)).rotationEffect(.degrees(-90))
                            VStack(spacing: 8) {
                                Text(String(format: "%02d:%02d", remaining / 60, remaining % 60)).font(.system(size: 54, weight: .light, design: .rounded)).monospacedDigit()
                                Text("You’ve got this.").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }.frame(maxWidth: 270).aspectRatio(1, contentMode: .fit)
                        .accessibilityElement(children: .ignore).accessibilityLabel("\(remaining / 60) minutes and \(remaining % 60) seconds remaining")
                        .onChange(of: remaining) { _, value in
                            if value == 0 {
                                progress.completeFocusIfNeeded()
                                UINotificationFeedbackGenerator().notificationOccurred(.success)
                                message = "Your session is complete. Time for a breather."
                            }
                        }
                    }
                    Button("End this session", role: .destructive) { cancel = true }.buttonStyle(.bordered).controlSize(.large)
                } else {
                    Image(systemName: "timer").font(.system(size: 80, weight: .ultraLight)).foregroundStyle(AppDesign.purple).padding(25).accessibilityHidden(true)
                    Picker("Session length", selection: $minutes) {
                        ForEach([5, 15, 25, 45], id: \.self) { Text("\($0) min").tag($0) }
                    }.pickerStyle(.segmented)
                    Button {
                        progress.startFocus(minutes: minutes)
                        if let session = progress.focus { Task { await notifications.scheduleFocus(session) } }
                        message = nil
                    } label: { Label("Start focusing", systemImage: "play.fill").font(.headline).frame(maxWidth: .infinity).padding(10) }
                        .buttonStyle(.borderedProminent).controlSize(.large).tint(AppDesign.purple).accessibilityIdentifier("focus.start")
                }
                if let message { Text(message).foregroundStyle(.green).accessibilityAddTraits(.updatesFrequently) }
                Text("The timer keeps time when the app is closed. To hear a completion alert in the background, enable notifications in Settings. Focus time is stored on this device and does not award account rewards.")
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Label("\(progress.focusMinutes) minutes completed", systemImage: "checkmark.circle").font(.subheadline).foregroundStyle(.secondary)
            }.padding(24).frame(maxWidth: 580).frame(maxWidth: .infinity)
        }.background(AppDesign.background).navigationTitle("Focus")
        .confirmationDialog("End your focus session?", isPresented: $cancel, titleVisibility: .visible) {
            Button("End without adding focus time", role: .destructive) { progress.stopFocus(); notifications.cancelFocus() }
        }
    }
}
