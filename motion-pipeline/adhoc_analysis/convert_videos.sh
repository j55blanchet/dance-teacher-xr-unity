# convert_videos.sh
#
# This script will convert all videos from the input directory into
# a mp4 with the h.264 codec and aac audio codec using ffmpeg. The 
# output files will be placed in the output directory.

# Input directory
INPUT_DIR=$1

# Output directory
OUTPUT_DIR=$2

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
    echo "Input directory does not exist"
    exit 1
fi

# Check if output directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
    
    # Create output directory
    mkdir $OUTPUT_DIR
fi

# Loop through all files in input directory
for file in $INPUT_DIR/*; do

    # Get file name
    filename=$(basename -- "$file")

    # Get file extension
    extension="${filename##*.}"

    # Get file name without extension
    filename="${filename%.*}"

    # Check if file is a video
    if [ "$extension" == "mp4" ]; then
        # Convert video
        ffmpeg -i $file -c:v libx264 -c:a aac $OUTPUT_DIR/$filename.mp4
    fi
done