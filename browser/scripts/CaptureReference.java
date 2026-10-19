import java.awt.Component;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import javax.swing.JFrame;
import javax.swing.SwingUtilities;

// Run from the untouched Java asset folder with compiled classes in a temp directory.
public class CaptureReference {
    static Object reference;
    static JFrame frame;
    static int value(String name) throws Exception {
        var field = reference.getClass().getDeclaredField(name);
        field.setAccessible(true);
        return field.getInt(reference);
    }
    static void set(String name, Object value) throws Exception {
        var field = reference.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(reference, value);
    }
    static void capture(Path path) throws Exception {
        SwingUtilities.invokeAndWait(() -> {
            try {
                Component content = frame.getContentPane();
                BufferedImage image = new BufferedImage(content.getWidth(), content.getHeight(), BufferedImage.TYPE_INT_RGB);
                var graphics = image.createGraphics();
                content.paint(graphics);
                graphics.dispose();
                ImageIO.write(image, "png", path.toFile());
            } catch (Exception error) { throw new RuntimeException(error); }
        });
    }
    public static void main(String[] args) throws Exception {
        Path out = Path.of(args[0]);
        Files.createDirectories(out);
        SwingUtilities.invokeAndWait(() -> {
            try {
                reference = Class.forName("Sidescroller2").getConstructor().newInstance();
                reference.getClass().getMethod("launch").invoke(reference);
                var field = reference.getClass().getDeclaredField("f");
                field.setAccessible(true);
                frame = (JFrame) field.get(reference);
            } catch (Exception error) { throw new RuntimeException(error); }
        });
        Thread.sleep(800);
        capture(out.resolve("native-menu.png"));
        set("startGame", true);
        reference.getClass().getMethod("readInfo").invoke(reference);
        set("yPos", 0);
        Thread.sleep(800);
        capture(out.resolve("native-playing.png"));
        int startX = value("xPos");
        frame.getKeyListeners()[0].keyPressed(new KeyEvent(frame, KeyEvent.KEY_PRESSED, System.currentTimeMillis(), 0, KeyEvent.VK_3, '3'));
        Thread.sleep(200);
        frame.getKeyListeners()[0].keyReleased(new KeyEvent(frame, KeyEvent.KEY_RELEASED, System.currentTimeMillis(), 0, KeyEvent.VK_3, '3'));
        String json = "{\"baseline\":\"Sidescroller2\",\"outerWidth\":" + frame.getWidth() +
            ",\"outerHeight\":" + frame.getHeight() + ",\"contentWidth\":" + frame.getContentPane().getWidth() +
            ",\"contentHeight\":" + frame.getContentPane().getHeight() + ",\"startX\":" + startX +
            ",\"xAfter200msRight\":" + value("xPos") + ",\"yPos\":" + value("yPos") + "}\n";
        Files.writeString(out.resolve("native-metrics.json"), json);
        System.out.println(json);
        frame.dispose();
        System.exit(0);
    }
}
