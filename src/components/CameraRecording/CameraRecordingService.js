class CameraRecordingService {
  static async hasCameraPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'camera' })

      if (result.state === 'prompt') return undefined;

      return result.state === 'granted';
    } catch (error) {
      return undefined;
    }
  }

  static async requestCameraPermission() {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.log('User has not granted permission to use the camera');
      } else {
        console.log("Something went wrong!", error);
      }
    } finally {
      return await this.hasCameraPermission();
    }
  }
}

export { CameraRecordingService };
