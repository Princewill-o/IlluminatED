import Foundation

struct RevisionQuestion: Codable, Identifiable, Equatable {
    let id: String
    let subject: String
    let course: String
    let topic: String
    let prompt: String
    let options: [String]
    let answer: Int
    let explanation: String

    var valid: Bool {
        !id.isEmpty && !prompt.isEmpty && !explanation.isEmpty && options.count >= 2 && options.indices.contains(answer)
    }
}

struct RevisionPack: Codable {
    let version: Int
    let source: String
    let questions: [RevisionQuestion]
}

struct RevisionResult: Codable, Identifiable, Equatable {
    let id: UUID
    let date: Date
    let subject: String
    let correct: Int
    let total: Int

    var percentage: Int { total > 0 ? Int((Double(correct) / Double(total) * 100).rounded()) : 0 }
    var valid: Bool { total > 0 && correct >= 0 && correct <= total }
}

enum RevisionSession {
    static func questions(from bank: [RevisionQuestion], subject: String?, limit: Int = 5) -> [RevisionQuestion] {
        Array(bank.filter { $0.valid && (subject == nil || $0.subject == subject) }.shuffled().prefix(max(0, limit)))
    }
}
