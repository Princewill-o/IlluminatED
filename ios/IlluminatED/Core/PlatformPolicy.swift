import Foundation

enum PlatformDecision: Equatable {
    case platform
    case external
    case subscription
    case deny
}

/// No arbitrary hosts, HTTP downgrade, credential-bearing links or native checkout.
struct PlatformPolicy {
    let origin: URL
    private let subscriptionRoots = ["/premium", "/pricing", "/billing", "/games/expansions", "/games/store"]

    init(origin: URL = URL(string: "https://www.illumed.co.uk")!) {
        self.origin = origin
    }

    func isTrusted(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == "https", url.user == nil, url.password == nil,
              url.port == nil || url.port == 443, let host = url.host?.lowercased() else { return false }
        return host == origin.host?.lowercased() || host == "illumed.co.uk" || host == "www.illumed.co.uk"
    }

    func decision(for url: URL) -> PlatformDecision {
        guard let scheme = url.scheme?.lowercased() else { return .deny }
        if isTrusted(url) {
            let path = url.path.removingPercentEncoding ?? url.path
            if subscriptionRoots.contains(where: { path == $0 || path.hasPrefix($0 + "/") }) { return .subscription }
            return .platform
        }
        if scheme == "https", url.user == nil, url.password == nil {
            // Digital purchases are not redirected to a browser checkout from iOS.
            let host = url.host?.lowercased() ?? ""
            if host == "stripe.com" || host.hasSuffix(".stripe.com") { return .subscription }
            return .external
        }
        if ["mailto", "tel"].contains(scheme) { return .external }
        return .deny
    }

    func platformURL(path: String) -> URL? {
        guard path.hasPrefix("/"), !path.hasPrefix("//"), !path.contains("\\"),
              !path.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
              let url = URL(string: path, relativeTo: origin)?.absoluteURL,
              isTrusted(url), decision(for: url) == .platform else { return nil }
        return url
    }

    /// Custom links may select a known screen; never accept tokens or arbitrary URLs.
    func deepLink(_ link: URL) -> URL? {
        guard link.scheme == "illuminated", link.host == "open",
              let items = URLComponents(url: link, resolvingAgainstBaseURL: false)?.queryItems,
              items.count == 1, items[0].name == "screen", let screen = items[0].value else { return nil }
        let screens = ["life": "/games/world", "study": "/games/study", "homework": "/homework", "account": "/me"]
        return screens[screen].flatMap { platformURL(path: $0) }
    }
}
