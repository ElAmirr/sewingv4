Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator {}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int NotImpl1();
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    [PreserveSig] int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
    int j();
    [PreserveSig] int GetMasterVolumeLevelScalar(out float pfLevel);
    int k(); int l(); int m(); int n();
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
    [PreserveSig] int GetMute(out bool pbMute);
}

public class AudioManager {
    public static void EnsureVolume(float level) {
        Type enumType = Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
        var enumerator = (IMMDeviceEnumerator)Activator.CreateInstance(enumType);
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);
        object volObj;
        var iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
        device.Activate(ref iid, 23, IntPtr.Zero, out volObj);
        var vol = (IAudioEndpointVolume)volObj;
        vol.SetMute(false, Guid.Empty);
        vol.SetMasterVolumeLevelScalar(level, Guid.Empty);
    }
}
'@

# Set volume to 90% and unmute system audio
[AudioManager]::EnsureVolume(0.90)
