import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateEventDto {
   @IsString()
   @IsNotEmpty()
   title!: string;

   @IsDateString()
   startTime!: string;

   @IsDateString()
   endTime!: string;

   @IsString()
   @IsNotEmpty()
   timezone!: string;
}
