class Stop < ApplicationRecord
  belongs_to :trip
  geocoded_by :address
  validates :latitude, :longitude, presence: true
  before_validation :geocode, if: :will_save_change_to_address?
end
