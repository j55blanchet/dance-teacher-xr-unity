

VIDEO_FILE_LIST = $(shell ls *.mp4)

all: $(VIDEO_FILE_LIST)

OUTPUT_FOLDER = ./output

$(VIDEO_FILE_LIST):
    @echo "Converting $@ to h.264"
    ffmpeg -i $@ -c:v libx264 $(OUTPUT_FOLDER)/$@.mp4