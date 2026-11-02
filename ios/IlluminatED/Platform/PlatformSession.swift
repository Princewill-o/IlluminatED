import SwiftUI
import WebKit
import Network

struct PlatformDialog: Identifiable {
    enum Kind { case alert, confirm, prompt }
    let id = UUID()
    let title = "IlluminatED"
    let message: String
    let kind: Kind
    var defaultText: String = ""
    let completion: (String?) -> Void
}

@MainActor
final class PlatformSession: NSObject, ObservableObject {
    @Published var presented = false
    @Published var loading = false
    @Published var canGoBack = false
    @Published var error: String?
    @Published var offline = false
    @Published var subscriptionNotice = false
    @Published var externalURL: URL?
    @Published var shareItems: [Any] = []
    @Published var sharing = false
    @Published var dialog: PlatformDialog?
    private(set) var currentURL: URL?
    private var lastGetURL: URL?
    private var progressObservation: NSKeyValueObservation?
    private var historyObservation: NSKeyValueObservation?
    private let monitor = NWPathMonitor()
    private var downloadFiles: [ObjectIdentifier: URL] = [:]
    private var temporaryDownloads: [URL] = []
    let policy = AppConfiguration.policy

    lazy var webView: WKWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = [.audio, .video]
        configuration.applicationNameForUserAgent = "IlluminatED-iOS/1"
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = self
        view.uiDelegate = self
        view.allowsBackForwardNavigationGestures = true
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.isOpaque = false
        view.backgroundColor = UIColor.systemBackground
        view.underPageBackgroundColor = UIColor.systemBackground
        if #available(iOS 16.4, *) {
            #if DEBUG
            view.isInspectable = true
            #endif
        }
        progressObservation = view.observe(\.estimatedProgress, options: [.new]) { [weak self] view, _ in
            Task { @MainActor in self?.loading = view.isLoading }
        }
        historyObservation = view.observe(\.canGoBack, options: [.new]) { [weak self] view, _ in
            Task { @MainActor in self?.canGoBack = view.canGoBack }
        }
        return view
    }()

    override init() {
        super.init()
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in self?.offline = path.status != .satisfied }
        }
        monitor.start(queue: DispatchQueue(label: "uk.co.illumed.connection"))
    }

    deinit { monitor.cancel() }

    func open(path: String) {
        guard let url = policy.platformURL(path: path) else { return }
        open(url)
    }

    func open(_ url: URL) {
        guard policy.decision(for: url) == .platform else { return }
        error = nil
        resumeMedia()
        presented = true
        if webView.url != url { load(url) }
    }

    private func load(_ url: URL) {
        lastGetURL = url
        webView.load(URLRequest(url: url, timeoutInterval: 45))
    }

    func retry() {
        error = nil
        if let url = lastGetURL { load(url) }
    }

    func back() { if webView.canGoBack { webView.goBack() } }

    func resumeMedia() { webView.setAllMediaPlaybackSuspended(false, completionHandler: nil) }

    func pauseMedia() {
        // Stop microphone/camera tracks when the app or platform is left.
        webView.setMicrophoneCaptureState(.none)
        webView.setCameraCaptureState(.none)
        webView.pauseAllMediaPlayback(completionHandler: nil)
        webView.setAllMediaPlaybackSuspended(true, completionHandler: nil)
    }

    func close() { pauseMedia(); resolveDialog(nil); presented = false }

    func resolveDialog(_ value: String?) {
        let pending = dialog
        dialog = nil
        pending?.completion(value)
    }

    func sharePage() {
        guard let currentURL = webView.url, policy.isTrusted(currentURL),
              !currentURL.path.hasPrefix("/auth"), !currentURL.path.hasPrefix("/account") else { return }
        // Share the page path only; never callback codes, tokens, fragments or query data.
        var components = URLComponents(url: currentURL, resolvingAgainstBaseURL: false)
        components?.query = nil; components?.fragment = nil
        if let url = components?.url { shareItems = [url]; sharing = true }
    }

    func pasteSignInLink(_ value: String) {
        guard let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)), policy.isTrusted(url),
              ["/auth/callback", "/account/password"].contains(url.path) else {
            error = "That is not an IlluminatED sign-in link. Request a fresh email link from the sign-in page."
            return
        }
        error = nil
        load(url)
    }

    func cleanupDownloads() {
        let activeFolders = Set(downloadFiles.values.map { $0.deletingLastPathComponent() })
        for url in temporaryDownloads where !activeFolders.contains(url) { try? FileManager.default.removeItem(at: url) }
        temporaryDownloads.removeAll { !activeFolders.contains($0) }
    }
}

extension PlatformSession: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        // Documents can embed resources (e.g. lesson videos) without navigating the main page.
        guard action.targetFrame?.isMainFrame != false else { decisionHandler(.allow); return }
        switch policy.decision(for: url) {
        case .platform:
            if action.shouldPerformDownload { decisionHandler(.download); return }
            if action.request.httpMethod == "GET" { lastGetURL = url }
            if action.targetFrame == nil { webView.load(action.request); decisionHandler(.cancel) }
            else { decisionHandler(.allow) }
        case .external:
            decisionHandler(.cancel)
            if action.navigationType == .linkActivated {
                if url.scheme == "https" { externalURL = url }
                else { UIApplication.shared.open(url) }
            }
        case .subscription:
            decisionHandler(.cancel); subscriptionNotice = true
        case .deny:
            // Same-origin blob downloads are created by existing CV/export features.
            if url.scheme == "blob", action.shouldPerformDownload, let page = webView.url, policy.isTrusted(page) {
                decisionHandler(.download)
            } else { decisionHandler(.cancel) }
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if response.isForMainFrame, let http = response.response as? HTTPURLResponse, http.statusCode >= 500 {
            error = "The platform is taking a breather. Please try again in a moment."
        }
        let attachment = (response.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Disposition")?.lowercased().contains("attachment") == true
        decisionHandler(!response.canShowMIMEType || attachment ? .download : .allow)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { loading = true }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loading = false; currentURL = webView.url; canGoBack = webView.canGoBack
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError failure: Error) { failed(failure) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError failure: Error) { failed(failure) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loading = false
        error = "The city needed more memory. You can reopen this page, or return to offline revision."
    }
    private func failed(_ failure: Error) {
        loading = false
        let code = (failure as NSError).code
        if code == NSURLErrorCancelled || code == 102 { return }
        error = "We couldn’t load the platform. Check your connection and try again. Offline revision and Focus are still available."
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
}

extension PlatformSession: WKUIDelegate {
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
        for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if action.targetFrame == nil, let url = action.request.url {
            if policy.decision(for: url) == .platform { webView.load(action.request) }
            else if policy.decision(for: url) == .external, url.scheme == "https", action.navigationType == .linkActivated { externalURL = url }
            else if policy.decision(for: url) == .subscription { subscriptionNotice = true }
        }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard let url = frame.request.url, frame.isMainFrame, policy.isTrusted(url) else { completionHandler(); return }
        resolveDialog(nil)
        dialog = PlatformDialog(message: message, kind: .alert) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard let url = frame.request.url, frame.isMainFrame, policy.isTrusted(url) else { completionHandler(false); return }
        resolveDialog(nil)
        dialog = PlatformDialog(message: message, kind: .confirm) { completionHandler($0 == "confirm") }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        guard let url = frame.request.url, frame.isMainFrame, policy.isTrusted(url) else { completionHandler(nil); return }
        resolveDialog(nil)
        dialog = PlatformDialog(message: prompt, kind: .prompt, defaultText: defaultText ?? "", completion: completionHandler)
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        let url = URL(string: "\(origin.protocol)://\(origin.host)\(origin.port == 0 || origin.port == 443 ? "" : ":\(origin.port)")")
        decisionHandler(url.map(policy.isTrusted) == true && frame.isMainFrame ? .prompt : .deny)
    }
}

extension PlatformSession: WKDownloadDelegate {
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let name = URL(fileURLWithPath: suggestedFilename).lastPathComponent
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let url = folder.appendingPathComponent(name.isEmpty || name == "." || name == ".." ? "IlluminatED-export" : name)
            downloadFiles[ObjectIdentifier(download)] = url
            temporaryDownloads.append(folder)
            completionHandler(url)
        } catch { completionHandler(nil); self.error = "There wasn’t enough room to save that file." }
    }

    func downloadDidFinish(_ download: WKDownload) {
        if let url = downloadFiles.removeValue(forKey: ObjectIdentifier(download)) { shareItems = [url]; sharing = true }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadFiles.removeValue(forKey: ObjectIdentifier(download))
        self.error = "The download could not finish. Please try exporting again."
    }
}
