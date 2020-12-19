
import os
import re
import shutil
import datetime
import glob
import logging
import logging.handlers
import time
from functools import reduce
from itertools import chain
from PIL import Image
from PIL.ExifTags import TAGS


SEARCH_PATHES = [
    "/Volumes/disk1/legacyData/**"
]
TARGET_EXTS = [
    "*.jpg", "*.jpeg", "*.png",
    "*.mp4", "*.mov", "*.mts", "*.m2ts", "*.avi", "*.gp3"
]
OUTPUT_DIR = "/Volumes/disk1/photos"
MIN_FILE_SIZE = 10 * 1000


class CustomLogFilter(logging.Filter):
    startTime = time.time()

    def filter(self, record):
        record.tickTime = time.time() - CustomLogFilter.startTime
        return True


LOG = logging.getLogger("main")
LOG.addHandler(logging.handlers.RotatingFileHandler(
    "copyLog.txt", maxBytes=1000*1000*10, backupCount=100))
LOG.addHandler(logging.StreamHandler())
LOG.addFilter(CustomLogFilter())
LOG.setLevel(logging.INFO)
for hdr in LOG.handlers:
    hdr.setFormatter(logging.Formatter(
        "%(asctime)s [%(tickTime)0.3f] <%(levelname)1s> %(filename)s %(threadName)s | %(message)s"))


def main():
    search()
    # delete_small_files()


def delete_small_files():
    LOG.info("start delete small failes")
    count = 0
    delete_count = 0
    for file in searchFiles([OUTPUT_DIR + "/**"], TARGET_EXTS):
        count += 1
        if MIN_FILE_SIZE >= os.path.getsize(file):
            try:
                LOG.info("%05d:DELETE %s", count, file)
                os.remove(file)
                delete_count += 1
            except Exception as e:
                LOG.warn("%05d:DELETE fail %s", count, e)
    LOG.info("delete finish. total %d, delete count %d", count, delete_count)


def search():
    files = searchFiles(SEARCH_PATHES, TARGET_EXTS)
    count = 0
    copyCount = 0
    LOG.info("Search start")
    for file in files:
        count += 1
        if count % 1000 == 0:
            LOG.info("count = %d", count)
        try:
            with Image.open(file) as img:
                datetimeinfo = get_exif(img)
                if not re.match(r'¥d¥d¥d¥d.¥d¥d', datetimeinfo):
                    raise Exception
        except Exception:
            try:
                datetimeinfo = str(datetime.datetime.fromtimestamp(
                    os.path.getmtime(file)))
            except Exception:
                datetimeinfo = None

        if datetimeinfo is not None:
            try:
                outputDirPath = make_path(OUTPUT_DIR, datetimeinfo)
                os.makedirs(outputDirPath, exist_ok=True)
                outputFilePath = os.path.join(
                    outputDirPath, os.path.basename(file))
                if ((not os.path.exists(outputFilePath)) and
                   (MIN_FILE_SIZE < os.path.getsize(file))):
                    LOG.info("%05d:Copy: [%s] -> [%s]" %
                             (count, file, outputFilePath))
                    shutil.copy2(file, outputFilePath)
                    copyCount += 1
                else:
                    LOG.debug("%05d:Skip: [%s]" % (count, file))
            except Exception as e:
                LOG.error("%05d:Copy Error %s %s" % (count, file, e))
        else:
            LOG.warn("%05d:File Not found", count)
    LOG.info("Search end. File count is %d, copy count is %d",
             count, copyCount)


def searchFiles(pathes: list, exts: list) -> list:
    """
    searchFiles in pathes with target extention.
    Ex) searchFiles(["/mnt/media1", "/mnt/usb/**/music], ["*.mp3", "*.jpg"])
    case of extension is ignored.
    return list of file path
    """
    TARGET_EXTS = [''.join(map(lambda c: '[%s%s]' % (
        c.lower(), c.upper()) if c.isalpha() else c, ext)) for ext in exts]
    targetPathes = [
        dirPath + "/" + ext for dirPath in pathes for ext in TARGET_EXTS
    ]
    foundFiles = map(lambda x: glob.iglob(x, recursive=True), targetPathes)
    foundFiles = reduce(lambda a, b: chain(a, b), foundFiles)  # Flatten
    return foundFiles


def make_path(baseDir, timeStr):
    path = os.path.join(baseDir, timeStr[0:4] + "-" + timeStr[5:7])
    return path


def get_exif(img):
    exif = img._getexif()
    for id, val in exif.items():
        tg = TAGS.get(id, id)
        if tg == "DateTimeOriginal":
            return val


if __name__ == "__main__":
    main()
