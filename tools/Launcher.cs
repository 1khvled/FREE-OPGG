using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace OpggFastLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                string targetExe = @"D:\open-opgg\dist\win-unpacked\OP.GG Desktop OpenSource.exe";
                string workDir = @"D:\open-opgg\dist\win-unpacked";

                if (!File.Exists(targetExe))
                {
                    MessageBox.Show("OP.GG executable not found at:\n" + targetExe, "OP.GG Fast Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // Check if already running
                Process[] existing = Process.GetProcessesByName("OP.GG Desktop OpenSource");
                if (existing.Length > 0)
                {
                    // Already running, launch will bring to focus via single-instance lock
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = targetExe;
                psi.WorkingDirectory = workDir;
                psi.UseShellExecute = true;

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to launch OP.GG:\n" + ex.Message, "OP.GG Fast Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
