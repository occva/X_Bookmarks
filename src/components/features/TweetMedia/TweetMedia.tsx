import { memo } from 'react'
import type { Media, ImageInfo } from '../../../types'
import styles from './TweetMedia.module.css'

interface TweetMediaProps {
  media: Media[]
  tweetId: string
  onImageClick: (imageInfo: ImageInfo) => void
}

export const TweetMedia = memo(function TweetMedia({
  media,
  tweetId,
  onImageClick,
}: TweetMediaProps) {
  if (!media || media.length === 0) return null

  const validMedia = media.filter(
    (m) => (m.original || m.thumbnail) && (m.original || m.thumbnail)?.trim() !== ''
  )

  if (validMedia.length === 0) return null

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight

    if (!naturalWidth || !naturalHeight) return

    const aspectRatio = naturalWidth / naturalHeight
    const container = img.closest(`.${styles.tweetMedia}`)

    if (container) {
      if (aspectRatio < 0.7) {
        container.classList.add(styles.tallImage)
      } else if (aspectRatio > 1.5) {
        container.classList.add(styles.wideImage)
      }
    }
  }

  const handleImageClick = (m: Media, index: number) => {
    const imgUrl = m.original || m.thumbnail || ''
    onImageClick({
      url: imgUrl,
      tweetId,
      index,
    })
  }

  if (validMedia.length === 1) {
    const imgUrl = validMedia[0].original || validMedia[0].thumbnail
    if (!imgUrl) return null

    return (
      <div className={styles.tweetMedia} data-tweet-id={tweetId}>
        <img
          src={imgUrl}
          alt="推文图片"
          loading="lazy"
          data-original={imgUrl}
          onLoad={handleImageLoad}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
          onClick={() => handleImageClick(validMedia[0], 0)}
        />
      </div>
    )
  }

  const gridClass =
    validMedia.length === 2
      ? styles.twoImages
      : validMedia.length === 3
        ? styles.threeImages
        : styles.fourImages

  return (
    <div className={`${styles.tweetMediaGrid} ${gridClass}`} data-tweet-id={tweetId}>
      {validMedia.map((m, index) => {
        const imgUrl = m.original || m.thumbnail
        if (!imgUrl) return null

        return (
          <img
            key={index}
            src={imgUrl}
            alt="推文图片"
            loading="lazy"
            data-original={imgUrl}
            data-tweet-id={tweetId}
            data-image-index={index}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            onClick={() => handleImageClick(m, index)}
          />
        )
      })}
    </div>
  )
})
