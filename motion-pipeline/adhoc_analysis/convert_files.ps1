# For now, this script simply prints a list of commands that can be run to convert the files.
# It doesn't actually run the commands, so you'll have to copy and paste them into a terminal.
# (because something if off with the ffmpeg command in powershell)


$videocodec = "libx265"  # Change this to the desired codec
$audiocodec = "aac"
$target_extension = "mp4"
$target_folder = "converted"

$othertags = ""
if ($videocodec -eq "libx265") {
    $othertags = "-tag:v hvc1"
}

# https://aaron.cc/ffmpeg-hevc-apple-devices/#:~:text=Using%20FFmpeg%20to%20Create%20HEVC%20Videos%20That%20Work,to%20HEVC%20...%204%20Batch-Convert%20a%20Folder%20

# Loop through all files in the current directory
foreach ($file in Get-ChildItem -File) {
    # Check if the file is a video file
    if ($file.Extension -match '\.(mp4|avi|mov|mkv)$') {
        # Construct the output filename
        $output_file = $target_folder + "\" + $file.Name
        $output_file = [System.IO.Path]::ChangeExtension($output_file, ".$target_extension")


        # Create the target folder if it doesn't exist
        if (!(Test-Path $target_folder)) {
            New-Item -ItemType Directory -Force -Path $target_folder
        }
        
        # Adjust for spaces in the command
        # print commmand that will be executed
        $input_filename = $file.FullName -replace " ", "` "
        $output_filename = $output_file -replace " ", "` "
        Write-Host "ffmpeg -i $input_filename -c:v $videocodec -c:a $audiocodec $othertags $output_filename"
        
        # Run ffmpeg to convert the file to the desired codec
        # & ffmpeg -i $input_filename -c:v $videocodec -c:a $audiocodec $othertags output_filename

        # Delete the original file
        # Remove-Item $file.FullName
    }
}

# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\Advanced-Cha-Cha-Solo-Practice-Routine--Latin-Dance-Tutorial.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\Advanced-Cha-Cha-Solo-Practice-Routine--Latin-Dance-Tutorial.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\Bust-Your-Windows--Jazmine-Sullivan--Solo-Ladies-Tango-Routine--Lady-Dance-Choreography.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\Bust-Your-Windows--Jazmine-Sullivan--Solo-Ladies-Tango-Routine--Lady-Dance-Choreography.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\CALEAF-_-HOUSE-DANCE-SOLO-_-STREETSTAR-2016.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\CALEAF-_-HOUSE-DANCE-SOLO-_-STREETSTAR-2016.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\Classical-Ballet-Solo-Charlene-Quek-Woo-Nim-𝘊𝘩𝘰𝘳𝘦𝘰𝘨𝘳𝘢𝘱𝘩𝘦𝘥-𝘣𝘺-𝘔𝘴-𝘒𝘰𝘬-𝘏𝘶𝘪𝘴𝘩𝘪.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\Classical-Ballet-Solo-Charlene-Quek-Woo-Nim-𝘊𝘩𝘰𝘳𝘦𝘰𝘨𝘳𝘢𝘱𝘩𝘦𝘥-𝘣𝘺-𝘔𝘴-𝘒𝘰𝘬-𝘏𝘶𝘪𝘴𝘩𝘪.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\Doja-cat--You-right--Amy-Park-choreography.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\Doja-cat--You-right--Amy-Park-choreography.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\Red-Velvet--Psycho-Dance-Cover--Ellen-and-Brian.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\Red-Velvet--Psycho-Dance-Cover--Ellen-and-Brian.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\These-Boots-Were-Made-For-Walking--Maddie-Ziegler-Full-Solo--2015-ALDC-Showcase.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\These-Boots-Were-Made-For-Walking--Maddie-Ziegler-Full-Solo--2015-ALDC-Showcase.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\Tinashe--Party-Favors-ft-Young-Thug--Cheshir-Choreo-Class -Justjerk-Dance-Academy_v720P.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\Tinashe--Party-Favors-ft-Young-Thug--Cheshir-Choreo-Class -Justjerk-Dance-Academy_v720P.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\waacking-basic-freestyle.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\waacking-basic-freestyle.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\Waves--Contemporary-Ballet-at-Master-Ballet-Academy.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\Waves--Contemporary-Ballet-at-Master-Ballet-Academy.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\WOMAN--Doja-Cat-Tahani-Anderson-Choreography.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\WOMAN--Doja-Cat-Tahani-Anderson-Choreography.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\WSS19--Jordynn-Lurie-Pro-Ladies-Solo-Salsa-World-Champion.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\WSS19--Jordynn-Lurie-Pro-Ladies-Solo-Salsa-World-Champion.mp4;
# ffmpeg -i D:\dev\humanmotion\dance-teacher-xr\motion-pipeline\data\source_videos\selena\YOU-ARE-THE-REASON--Lyrical-Dance-Solo-2021.mp4 -c:v libx265 -c:a aac -tag:v hvc1 converted\YOU-ARE-THE-REASON--Lyrical-Dance-Solo-2021.mp4;