import SwiftUI

struct RootView: View {
    @EnvironmentObject private var platform: PlatformSession
    @AppStorage("welcome.complete") private var welcomed = false
    @State private var tab = 0

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack { TodayView(onFocus: { tab = 2 }, onPractice: { tab = 1 }) }
                .tabItem { Label("Today", systemImage: "sun.max.fill") }.tag(0)
            NavigationStack { PracticeView() }
                .tabItem { Label("Revise", systemImage: "book.closed.fill") }.tag(1)
            NavigationStack { FocusView() }
                .tabItem { Label("Focus", systemImage: "timer") }.tag(2)
            NavigationStack { AppSettingsView() }
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }.tag(3)
        }
        .sensoryFeedback(.selection, trigger: tab)
        .fullScreenCover(isPresented: $platform.presented, onDismiss: { platform.pauseMedia() }) {
            PlatformView().environmentObject(platform)
        }
        .sheet(isPresented: Binding(get: { !welcomed && !platform.presented }, set: { if !$0 { welcomed = true } })) {
            WelcomeView { welcomed = true }
                .interactiveDismissDisabled()
        }
    }
}

struct WelcomeView: View {
    let onContinue: () -> Void
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Image("AppMark").resizable().scaledToFit().frame(width: 88, height: 88)
                    .clipShape(RoundedRectangle(cornerRadius: 24)).padding(.top, 25).accessibilityHidden(true)
                Text("Your next\nchapter starts here.").font(.largeTitle.bold()).tracking(-1.2)
                Text("Study a little. Try a career. Build a life of your own.").font(.title3).foregroundStyle(.secondary)
                Label("Revise and use flashcards offline", systemImage: "book.closed").padding(.top, 6)
                Label("Make time with a native focus timer", systemImage: "timer")
                Label("Bring your existing account into the city", systemImage: "building.2")
                Text("Offline practice stays on this device and earns no account XP or Clout. Sign in inside the platform for saved study rewards, jobs, homes and friends. Accounts are for ages 13 and over.")
                    .font(.footnote).foregroundStyle(.secondary)
                Button(action: onContinue) { Text("Let’s get started").font(.headline).frame(maxWidth: .infinity).padding(10) }
                    .buttonStyle(.borderedProminent).controlSize(.large).accessibilityIdentifier("welcome.continue")
            }.padding(28).frame(maxWidth: 600)
        }.background(AppDesign.background)
    }
}

struct TodayView: View {
    @EnvironmentObject private var progress: LocalProgress
    @EnvironmentObject private var platform: PlatformSession
    let onFocus: () -> Void
    let onPractice: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            brandHeader
            identityHeader
            journal
        }
        .background(AppDesign.background)
        .safeAreaInset(edge: .bottom, spacing: 0) { learningControls }
        .navigationTitle("Today")
        .toolbar(.hidden, for: .navigationBar)
    }

    private var brandHeader: some View {
        HStack(spacing: 10) {
            Image("AppMark").resizable().scaledToFit().frame(width: 30, height: 30)
                .clipShape(RoundedRectangle(cornerRadius: 9)).accessibilityHidden(true)
            Text("IlluminatED").font(.headline).tracking(-0.4)
            Spacer(minLength: 8)
            Menu {
                Button { platform.open(path: "/games/study") } label: { Label("Study & earn", systemImage: "graduationcap") }
                Button { platform.open(path: "/homework") } label: { Label("Homework", systemImage: "checklist") }
                Button { platform.open(path: "/me") } label: { Label("My platform account", systemImage: "person.crop.circle") }
            } label: {
                Image(systemName: "line.3.horizontal").font(.headline).frame(width: 44, height: 44)
            }.accessibilityLabel("Learning actions")
        }
        .foregroundStyle(.white).padding(.leading, 18).padding(.trailing, 8)
        .background(AppDesign.gradient)
    }

    private var identityHeader: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: "person.crop.circle.fill")
                .font(.system(size: 42)).foregroundStyle(AppDesign.blue.opacity(0.8))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text("Device practice").font(.headline)
                Text("Studying · on this iPhone").font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 6)
            VStack(alignment: .trailing, spacing: 4) {
                Text("LAST RESULT").font(.caption2.weight(.semibold)).tracking(0.7).foregroundStyle(.secondary)
                if let result = progress.results.first {
                    Text("\(result.correct) / \(result.total)").font(.title3.bold()).monospacedDigit()
                        .foregroundStyle(AppDesign.blue)
                } else {
                    Text("Not yet").font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                }
            }
            .accessibilityElement(children: .combine)
        }
        .padding(.horizontal, 18).padding(.vertical, 15)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .overlay(alignment: .bottom) { Divider() }
    }

    private var journal: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    Text("YOUR LEARNING STORY").font(.caption.weight(.semibold)).tracking(0.8)
                    Spacer()
                    Text("Recent first").font(.caption2).foregroundStyle(.secondary)
                }
                .foregroundStyle(AppDesign.blue).padding(.bottom, 20)

                if let focus = progress.focus {
                    LearningJournalRow(symbol: "timer", heading: "Time to focus", color: AppDesign.purple) {
                        Text("You have a \(focus.minutes)-minute focus session in progress. Return to Focus when you’re ready.")
                    }
                }

                if progress.results.isEmpty {
                    LearningJournalRow(symbol: "sparkles", heading: "Your next chapter", color: AppDesign.blue) {
                        Text("Choose a subject, try a few questions, and build your learning story one small step at a time.")
                    }
                    LearningJournalRow(symbol: "book.closed", heading: "Start with something small", color: AppDesign.purple) {
                        Text("Completed offline sessions will appear here, with your score and the subject you practised.")
                    }
                } else {
                    ForEach(progress.results.prefix(30)) { result in
                        LearningJournalRow(symbol: "checkmark.circle", heading: result.date.formatted(.dateTime.day().month(.abbreviated).hour().minute()), color: AppDesign.blue) {
                            Text("You practised \(result.subject) and answered \(result.correct) of \(result.total) questions correctly.")
                        }
                    }
                }

                if progress.focusMinutes > 0 {
                    LearningJournalRow(symbol: "leaf", heading: "Focus so far", color: AppDesign.purple) {
                        Text("You have completed \(progress.focusMinutes) minutes of focused time on this iPhone.")
                    }
                }

                Text("This journal stays on your device. Open My life for your signed-in character, Clout, work and home. Offline practice does not award account XP or Clout.")
                    .font(.caption).foregroundStyle(.secondary).lineSpacing(3)
                    .padding(.top, 6)
            }
            .padding(20).frame(maxWidth: 700, alignment: .leading).frame(maxWidth: .infinity)
        }
        .accessibilityIdentifier("today.journal")
    }

    private var learningControls: some View {
        VStack(spacing: 11) {
            Button(action: onPractice) {
                HStack(spacing: 10) {
                    Image(systemName: "plus.circle.fill").font(.title2)
                    Text("Continue learning").font(.headline)
                    Spacer(minLength: 4)
                    Image(systemName: "chevron.right").font(.caption.weight(.bold))
                }
                .foregroundStyle(.white).padding(.horizontal, 16).frame(minHeight: 50)
                .frame(maxWidth: .infinity).background(AppDesign.gradient, in: RoundedRectangle(cornerRadius: 17))
            }
            .buttonStyle(.plain).accessibilityIdentifier("today.continue")

            HStack(spacing: 8) {
                Button(action: onFocus) { Label("Focus", systemImage: "timer").frame(maxWidth: .infinity, minHeight: 44) }
                Button { platform.open(path: "/games/world") } label: {
                    Label("My life", systemImage: "building.2").frame(maxWidth: .infinity, minHeight: 44)
                }.accessibilityIdentifier("today.platform")
                Button { platform.open(path: "/me") } label: {
                    Label("Account", systemImage: "person.crop.circle").frame(maxWidth: .infinity, minHeight: 44)
                }
            }
            .font(.caption.weight(.semibold)).buttonStyle(.plain).foregroundStyle(AppDesign.blue)

            HStack(alignment: .top, spacing: 18) {
                compactStat(label: "Offline sessions", value: "\(progress.results.count)", symbol: "checkmark.circle", color: AppDesign.blue)
                Divider().frame(height: 28)
                compactStat(label: "Time focused", value: "\(progress.focusMinutes) min", symbol: "timer", color: AppDesign.purple)
            }
            .padding(.top, 8).overlay(alignment: .top) { Divider() }
        }
        .padding(.horizontal, 18).padding(.top, 14).padding(.bottom, 12)
        .frame(maxWidth: 700).frame(maxWidth: .infinity)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .overlay(alignment: .top) { Divider() }
    }

    private func compactStat(label: String, value: String, symbol: String, color: Color) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 7) {
            Image(systemName: symbol).font(.caption).foregroundStyle(color).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(label).font(.caption2).foregroundStyle(.secondary)
                Text(value).font(.subheadline.bold()).monospacedDigit()
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct LearningJournalRow<Content: View>: View {
    let symbol: String
    let heading: String
    let color: Color
    let content: Content

    init(symbol: String, heading: String, color: Color, @ViewBuilder content: () -> Content) {
        self.symbol = symbol
        self.heading = heading
        self.color = color
        self.content = content()
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol).font(.system(size: 16, weight: .medium))
                .foregroundStyle(color).frame(width: 26, height: 26)
                .background(color.opacity(0.08), in: Circle()).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                Text(heading).font(.caption.weight(.semibold)).foregroundStyle(color)
                content.font(.subheadline).lineSpacing(4).fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.bottom, 22)
        .accessibilityElement(children: .combine)
    }
}
