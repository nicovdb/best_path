class Trip < ApplicationRecord
  belongs_to :user
  has_many :stops, dependent: :destroy

  def coordinates
    stops.map do |stop|
      [stop.latitude, stop.longitude]
    end
  end
end
