import SwiftUI

@MainActor
final class RevisionLibrary: ObservableObject {
    let questions: [RevisionQuestion]
    let error: String?

    var subjects: [String] { Array(Set(questions.map(\.subject))).sorted() }

    init(bundle: Bundle = .main) {
        if let url = bundle.url(forResource: "RevisionPack", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let pack = try? JSONDecoder().decode(RevisionPack.self, from: data),
           pack.version == 1, !pack.questions.isEmpty, pack.questions.allSatisfy(\.valid) {
            questions = pack.questions; error = nil
        } else {
            questions = []
            error = "The revision pack could not be opened. Please reinstall the app or use online study."
        }
    }
}
