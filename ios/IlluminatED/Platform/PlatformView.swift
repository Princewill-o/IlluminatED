import SwiftUI
import WebKit
import SafariServices

struct PlatformView: View {
    @EnvironmentObject private var platform: PlatformSession
    @State private var signInHelp = false
    @State private var promptText = ""

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Button { platform.close() } label: { Label("App", systemImage: "chevron.down").font(.subheadline.weight(.semibold)) }
                    .frame(minWidth: 52, minHeight: 44).accessibilityLabel("Return to the app")
                Spacer(minLength: 0)
                Text("IlluminatED").font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                Spacer(minLength: 0)
                Menu {
                    Button { platform.back() } label: { Label("Previous page", systemImage: "chevron.left") }.disabled(!platform.canGoBack)
                    Button { platform.retry() } label: { Label("Reload page", systemImage: "arrow.clockwise") }
                    Button { platform.open(path: "/games/world") } label: { Label("My life", systemImage: "house") }
                    Button { platform.open(path: "/games/study") } label: { Label("Study", systemImage: "book") }
                    Button { platform.sharePage() } label: { Label("Share page", systemImage: "square.and.arrow.up") }
                    Button { signInHelp = true } label: { Label("Sign-in help", systemImage: "person.crop.circle.badge.questionmark") }
                } label: { Image(systemName: "ellipsis.circle").font(.title3).frame(width: 44, height: 44) }
                    .accessibilityLabel("Platform options")
            }.padding(.horizontal, 14).background(.bar)
            if platform.offline {
                Label("Offline · revision and Focus work in the app", systemImage: "wifi.slash")
                    .font(.caption).frame(maxWidth: .infinity).padding(8).background(Color.orange.opacity(0.12))
            }
            ZStack(alignment: .top) {
                PlatformWebView(session: platform)
                if platform.loading { ProgressView().progressViewStyle(.linear).accessibilityLabel("Loading platform") }
                if let error = platform.error {
                    VStack(spacing: 20) {
                        Image(systemName: "wifi.exclamationmark").font(.system(size: 46)).foregroundStyle(.secondary)
                        Text("Let’s try that again.").font(.title2.bold())
                        Text(error).foregroundStyle(.secondary).multilineTextAlignment(.center)
                        Button("Try again") { platform.retry() }.buttonStyle(.borderedProminent).controlSize(.large)
                        Button("Back to the app") { platform.close() }.buttonStyle(.bordered).controlSize(.large)
                    }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity).background(AppDesign.background)
                }
            }
        }
        .background(AppDesign.background)
        .alert("Your platform membership", isPresented: $platform.subscriptionNotice) {
            Button("Continue", role: .cancel) { }
        } message: { Text("This iOS build doesn’t sell digital subscriptions. Sign in to use the features already included with your account or school access. Free study and offline revision are available.") }
        .sheet(isPresented: Binding(get: { platform.externalURL != nil }, set: { if !$0 { platform.externalURL = nil } })) {
            if let url = platform.externalURL { ExternalPage(url: url) }
        }
        .sheet(isPresented: $platform.sharing, onDismiss: { platform.shareItems = []; platform.cleanupDownloads() }) {
            ShareSheet(items: platform.shareItems).presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $signInHelp) {
            NavigationStack {
                List {
                    Section("Use your existing account") {
                        Text("Sign in with your email and password inside the platform. Your account stays signed in on this device until you sign out.")
                        Button("Open sign in") { platform.open(path: "/sign-in?next=%2Fgames%2Fworld"); signInHelp = false }
                    }
                    Section("Using an email sign-in link?") {
                        Text("Request the link in this app. If Mail opens it in Safari, copy the link from the email and paste it here. Expired or already used links need to be requested again.")
                        PasteButton(payloadType: String.self) { values in
                            if let value = values.first { platform.pasteSignInLink(value); signInHelp = false }
                        }.labelStyle(.titleAndIcon)
                    }
                    Section { Text("Sign-in links are handled only by the IlluminatED website. They are never stored in your offline history or included in shared links.").font(.footnote).foregroundStyle(.secondary) }
                }.navigationTitle("Sign-in help").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { signInHelp = false } } }
            }
        }
        .alert(platform.dialog?.title ?? "IlluminatED", isPresented: Binding(get: { platform.dialog != nil }, set: { _ in })) {
            if platform.dialog?.kind == .prompt { TextField("Response", text: $promptText) }
            Button("OK") { platform.resolveDialog(platform.dialog?.kind == .prompt ? promptText : "confirm"); promptText = "" }
            if platform.dialog?.kind != .alert { Button("Cancel", role: .cancel) { platform.resolveDialog(nil); promptText = "" } }
        } message: { Text(platform.dialog?.message ?? "") }
        .onChange(of: platform.dialog?.id) { _, _ in promptText = platform.dialog?.defaultText ?? "" }
    }
}

struct PlatformWebView: UIViewRepresentable {
    let session: PlatformSession
    func makeUIView(context: Context) -> WKWebView { session.webView }
    func updateUIView(_ view: WKWebView, context: Context) { }
}

struct ExternalPage: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController { SFSafariViewController(url: url) }
    func updateUIViewController(_ controller: SFSafariViewController, context: Context) { }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) { }
}
