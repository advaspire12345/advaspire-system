import Image from "next/image";

interface ProfileCoverProps {
  coverUrl: string;
}

export function ProfileCover({ coverUrl }: ProfileCoverProps) {
  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-t-xl">
      <Image
        src={coverUrl}
        alt="Profile cover"
        fill
        priority
        className="object-cover"
      />
    </div>
  );
}
