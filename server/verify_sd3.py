import sys

def verify_sd3(filename):
    print(f"Verifying {filename}...")
    try:
        with open(filename, 'r', newline='') as f:
            lines = f.readlines()
            
        errors = 0
        for i, line in enumerate(lines):
            # Strip newline chars (\r\n or \n) to check content length
            content = line.strip('\r\n')
            if len(content) != 160:
                print(f"Error Line {i+1}: Length is {len(content)}, expected 160.")
                print(f"'{content}'")
                errors += 1
            
            if i == 0 and not content.startswith("A0"):
                print(f"Error Line 1: Must start with A0")
                errors += 1
            
            if i == len(lines)-1:
                if not content.startswith("Z0"):
                    print(f"Error Last Line: Must start with Z0")
                    errors += 1
                
        if errors == 0:
            print("SUCCESS: All lines are exactly 160 characters.")
            return True
        else:
            print(f"FAILED: Found {errors} errors.")
            return False
            
    except FileNotFoundError:
        print("File not found.")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        verify_sd3(sys.argv[1])
    else:
        # Generate dummy file for testing logic
        with open("test_verify.sd3", "w", newline='\r\n') as f:
            f.write("A0" + " "*158 + "\r\n")
            f.write("B1" + " "*158 + "\r\n")
            f.write("D0" + " "*158 + "\r\n")
            f.write("Z0" + " "*158 + "\r\n")
        verify_sd3("test_verify.sd3")
