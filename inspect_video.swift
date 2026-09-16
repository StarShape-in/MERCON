import AVFoundation

let inputURL = URL(fileURLWithPath: "frontend/web-dashboard/src/assets/truck animation.mp4")
let asset = AVAsset(url: inputURL)

Task {
    do {
        let duration = try await asset.load(.duration)
        let tracks = try await asset.load(.tracks)
        print("Duration in seconds: \(CMTimeGetSeconds(duration))")
        for track in tracks {
            if track.mediaType == .video {
                let size = try await track.load(.naturalSize)
                let nominalFrameRate = try await track.load(.nominalFrameRate)
                print("Video Size: \(size.width) x \(size.height), FPS: \(nominalFrameRate)")
            }
        }
    } catch {
        print("Error: \(error)")
    }
    exit(0)
}
dispatchMain()
