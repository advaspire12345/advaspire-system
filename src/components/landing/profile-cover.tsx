import Image from "next/image";

interface ProfileCoverProps {
  coverUrl: string;
}

export function ProfileCover({ coverUrl }: ProfileCoverProps) {
  return (
    <div className="relative h-[180px] w-full overflow-hidden rounded-t-xl sm:h-[220px] md:h-[300px]">
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
