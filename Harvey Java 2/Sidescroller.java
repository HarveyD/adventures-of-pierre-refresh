import java.awt.*;
import java.awt.event.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import javax.swing.*;

public class Sidescroller {
	BufferedReader in = new BufferedReader(new InputStreamReader(System.in));

	JFrame f;

	ImagePanel pic;

	Image PlayerCharacter;

	int[][] BoxLocations = new int[100][10];

	int PlayerCharacterX = 500, PlayerCharacterY = 550,
			PlayermomemtumXleft = 1, PlayermomemtumXright = 1,
			PlayermomemtumY = 1;

	String pictureName;

	boolean left = false, right = false, jump = false, inair = false,
			jumpRelease = true, movementallowedX = true,
			movementallowedY = true;

	class ImagePanel extends JPanel {
		Image backgroundImage;

		public ImagePanel(Image img) {
			backgroundImage = img;
		}

		public void paintComponent(Graphics g) {

			super.paintComponent(g);
		
			g.drawImage(backgroundImage, 0, 0, this);
			g.drawImage(PlayerCharacter, PlayerCharacterX, PlayerCharacterY, this);
			g.drawRect(PlayerCharacterX, PlayerCharacterY, 65, 100);

			for (int x = 0; x < 7; x++) {
				g.fillRect((BoxLocations[x][0] - 0),
						BoxLocations[x][1], BoxLocations[x][2],
						BoxLocations[x][3]);
			}
			// ground

		}
	}

	public static void main(String[] args) {
		Sidescroller ss = new Sidescroller();
		ss.launch();
	}

	public void readInfo() {
		try {
			BufferedReader in = new BufferedReader(new FileReader(new File(
					"Levels.txt")));
			pictureName = in.readLine();
			for (int x = 0; x < 7; x++) {
				BoxLocations[x][0] = Integer.parseInt(in.readLine());
				BoxLocations[x][1] = Integer.parseInt(in.readLine());
				BoxLocations[x][2] = Integer.parseInt(in.readLine());
				BoxLocations[x][3] = Integer.parseInt(in.readLine());
			}
			in.close();
		} catch (NumberFormatException nfe) {
		} catch (IOException ioe) {
		}
	}

	public void launch() {
		f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		f.addKeyListener(new MoveListener());
		f.setSize(1280, 720);
		// f.setLocation(300, 100);
		f.setResizable(false);
		f.getContentPane().add(pic, BorderLayout.CENTER);
		f.setVisible(true);
		PlayerCharacter = Toolkit.getDefaultToolkit().getImage(
				"player_character.png");
		Movement go = new Movement();
		go.start();
		Gravity go2 = new Gravity();
		go2.start();
		CollisionY go3 = new CollisionY();
		go3.start();
		CollisionX go4 = new CollisionX();
		go4.start();
	}

	public Sidescroller() {
		readInfo();
		f = new JFrame("The Adventures of Pierre");
		f.setFont(new Font("Modern", Font.BOLD, 20));
		pic = new ImagePanel(Toolkit.getDefaultToolkit().getImage(pictureName));
	}

	public class CollisionY extends Thread {
		public void run() {
			do {
				
				
				
				try {
					this.sleep(10);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class CollisionX extends Thread {
		public void run() {
			do {

				

				try {
					this.sleep(10);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class Gravity extends Thread {
		public void run() {
			do {
				// if this is deleted the guy will double jump
				inair = true;

				if (jump) {
					// this value controls height of jump
					PlayermomemtumY = -20;
					jump = false;
					inair = true;
				}

				if (movementallowedY) {
					PlayermomemtumY++;
					PlayerCharacterY = PlayerCharacterY + PlayermomemtumY;
				}
				// this is jump

				if (PlayerCharacterY > 550) {
					PlayerCharacterY=550;
					inair = false;
				}
				pic.repaint();
				try {
					this.sleep(13);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class Movement extends Thread {
		public void run() {
			do {
				// character movement for left
				if (left) {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								- PlayermomemtumXleft;
					}
					if (PlayermomemtumXleft < 20) {
						PlayermomemtumXleft++;
					}
				} else {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								- PlayermomemtumXleft;
					}
					if (PlayermomemtumXleft >= 0) {
						PlayermomemtumXleft--;
					}
				}
				// character movement for right
				if (right) {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								+ PlayermomemtumXright;
					}
					if (PlayermomemtumXright < 20) {
						PlayermomemtumXright++;
					}
				} else {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								+ PlayermomemtumXright;
					}
					if (PlayermomemtumXright >= 0) {
						PlayermomemtumXright--;
					}
				}
				pic.repaint();
				try {
					this.sleep(20);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	// button listener
	public class MoveListener implements KeyListener {
		public void keyReleased(KeyEvent e) {
			if (e.getKeyCode() == KeyEvent.VK_LEFT) {
				left = false;
			}
			if (e.getKeyCode() == KeyEvent.VK_RIGHT) {
				right = false;
			}
			if (e.getKeyCode() == KeyEvent.VK_SPACE) {
				jumpRelease = true;
			}
		}

		public void keyPressed(KeyEvent e) {
			if (e.getKeyCode() == KeyEvent.VK_LEFT) {
				left = true;
			}
			if (e.getKeyCode() == KeyEvent.VK_RIGHT) {
				right = true;

			}
			if (e.getKeyCode() == KeyEvent.VK_SPACE) {
				if (jumpRelease) {
					jumpRelease = false;
					if (!inair) {
						jump = true;
					}
				}
			}
		}

		public void keyTyped(KeyEvent e) {
		}
	}
}