// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "IlluminatEDCore",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [.library(name: "IlluminatEDCore", targets: ["IlluminatEDCore"])],
    targets: [
        .target(name: "IlluminatEDCore", path: "IlluminatED/Core"),
        .testTarget(name: "IlluminatEDCoreTests", dependencies: ["IlluminatEDCore"], path: "Tests")
    ]
)
